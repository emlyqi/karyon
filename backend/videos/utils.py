from openai import OpenAI
from django.conf import settings
from pydub import AudioSegment
import os
import numpy as np

def extract_audio(video_path, output_dir='media/audio'):
    """
    Extract audio from video file and save as MP3.
    Returns the path to the extracted audio file.
    """
    # Create audio directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate audio filename
    video_filename = os.path.basename(video_path)
    audio_filename = os.path.splitext(video_filename)[0] + '.mp3'
    audio_path = os.path.join(output_dir, audio_filename)
    
    # Extract audio
    video = AudioSegment.from_file(video_path)
    video.export(audio_path, format="mp3", bitrate="32k")  # Low bitrate for smaller files
    
    return audio_path

def transcribe_video(file_path):
    """
    Transcribe video using OpenAI Whisper API.
    Extracts audio first to reduce file size.
    Returns: (segments, audio_path)
    """
    # Extract audio from video
    audio_path = extract_audio(file_path)
    
    # Check file size (25MB limit)
    file_size = os.path.getsize(audio_path)
    max_size = 25 * 1024 * 1024  # 25MB
    
    if file_size > max_size:
        raise ValueError(f"Audio file too large: {file_size / 1024 / 1024:.1f}MB. Max: 25MB")
    
    # Transcribe the audio
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    with open(audio_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )

    # Extract segments
    segments = []
    for seg in transcription.segments:
        segments.append({
            'text': seg.text,
            'start': seg.start,
            'end': seg.end
        })
    
    return segments, audio_path

def chunk_transcript(segments, min_duration=15, max_duration=90, similarity_threshold=0.70):
    """
    Chunk transcript segments semantically using topic anchor comparison.
    Each segment is compared against the chunk's first segment (anchor).
    
    Args:
        segments: List of transcript segments with text, start, end
        min_duration: Minimum chunk duration (default: 15s)
        max_duration: Maximum chunk duration (default: 90s)  
        similarity_threshold: Topic change threshold (default: 0.70)
        
    Returns:
        List of chunks with text, start, end, and original segments
    """

    if not segments:
        return []
    
    # Embed all segments once
    model = SentenceTransformer('all-MiniLM-L6-v2')
    segment_texts = [seg['text'] for seg in segments]
    segment_embeddings = model.encode(segment_texts, show_progress_bar=False)

    # Normalize embeddings for cosine similarity
    segment_embeddings = segment_embeddings / np.linalg.norm(segment_embeddings, axis=1, keepdims=True)

    chunks = []
    current_chunk = {
        'text': '',
        'start': None,
        'end': None,
        'anchor_embedding': None,
        'segments': []
    }

    for i, seg in enumerate(segments):
        # Initialize first chunk
        if current_chunk['start'] is None:
            current_chunk['start'] = seg['start']
            current_chunk['text'] = seg['text'] + ' '
            current_chunk['end'] = seg['end']
            current_chunk['anchor_embedding'] = segment_embeddings[i]
            current_chunk['segments'].append(seg)
            continue

        chunk_duration = current_chunk['end'] - current_chunk['start']

        # Compute cosine similarity with anchor
        seg_embedding = segment_embeddings[i]
        similarity = np.dot(current_chunk['anchor_embedding'], seg_embedding)

        should_start_new_chunk = False
        if chunk_duration >= max_duration:
            should_start_new_chunk = True
        elif chunk_duration >= min_duration and similarity < similarity_threshold:
            should_start_new_chunk = True

        if should_start_new_chunk:
            # Finalize current chunk
            chunks.append({
                'text': current_chunk['text'].strip(),
                'start': current_chunk['start'],
                'end': current_chunk['end'],
                'segments': current_chunk['segments'].copy()
            })
            # Start new chunk
            current_chunk = {
                'text': seg['text'] + ' ',
                'start': seg['start'],
                'end': seg['end'],
                'anchor_embedding': seg_embedding,
                'segments': [seg]
            }
        else:
            # Continue current chunk
            current_chunk['text'] += seg['text'] + ' '
            current_chunk['end'] = seg['end']
            current_chunk['segments'].append(seg)

    # Add the last chunk if it has content
    if current_chunk['segments']:
        chunks.append({
            'text': current_chunk['text'].strip(),
            'start': current_chunk['start'],
            'end': current_chunk['end'],
            'segments': current_chunk['segments']
        })
    
    return chunks

def answer_question(video, question, max_distance=1.5):
    """
    Answer a question about a video using RAG.

    Args:
        video: Video object
        question: User's question
        max_distance: Distance threshold for relevance
        
    Returns:
        dict with answer, timestamp, confidence, and context
    """
    # Import here to avoid circular imports
    from videos.embeddings import embed_text, find_best_segment, model
    
    # Step 1: Get all chunks for this video
    video_chunks = list(video.chunks.all())
    
    if not video_chunks:
        return {
            'answer': "This video has no transcript chunks yet.",
            'confidence': 'none',
            'timestamp': None,
            'context': []
        }
    
    # Step 2: Embed the question and all chunks
    question_embedding = np.array(embed_text(question))
    chunk_texts = [chunk.text for chunk in video_chunks]
    chunk_embeddings = model.encode(chunk_texts, show_progress_bar=False)
    
    # Step 3: Calculate L2 distances
    distances = np.linalg.norm(chunk_embeddings - question_embedding, axis=1)
    
    # Step 4: Filter by max_distance and get top 5
    valid_indices = np.where(distances <= max_distance)[0]
    
    if len(valid_indices) == 0:
        return {
            'answer': "I couldn't find relevant information in the video to answer your question.",
            'confidence': 'none',
            'timestamp': None,
            'context': []
        }
    
    # Sort by distance and take top 5
    sorted_indices = valid_indices[np.argsort(distances[valid_indices])][:5]
    relevant_chunks = [(video_chunks[i], float(distances[i])) for i in sorted_indices]

    if not relevant_chunks:
        return {
            'answer': "I couldn't find relevant information in the video to answer your question.",
            'confidence': 'none',
            'timestamp': None,
            'context': []
        }
    
    # Step 2: Get best chunk and segment
    best_chunk, distance = relevant_chunks[0]
    best_segment = find_best_segment(best_chunk, question)

    # Step 3: Determine confidence
    if distance < 0.8:
        confidence = 'high'
    elif distance < 1.2:
        confidence = 'medium'
    else:
        confidence = 'low'

    # Step 4: Build context from top chunks
    context_texts = []
    for chunk, dist in relevant_chunks:
        context_texts.append(f"[{chunk.start_time:.1f}s - {chunk.end_time:.1f}s]: {chunk.text}")
    context = "\n\n".join(context_texts)

    # Step 5: Build prompt
    prompt = f"""
        You are a helpful assistant that answers questions about video content.

        Video: {video.title}

        Context from the video transcript:
        {context}

        Question: {question}

        Instructions:
        - Answer based ONLY on the context provided
        - Be concise and direct
        - If the context doesn't contain enough information, say so
        - Do not make up information

        Answer:"""
    
    # Step 6: Get answer from OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that answers questions about video content."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=300
    )

    answer_text = response.choices[0].message.content.strip()

    # Step 7: Return results
    return {
        'answer': answer_text,
        'confidence': confidence,
        'timestamp': best_segment['start'] if best_segment else best_chunk.start_time,
        'segment_text': best_segment['text'] if best_segment else None,
        'distance': float(distance),
        'context': [
            {
                'chunk_id': chunk.chunk_id,
                'start': chunk.start_time,
                'end': chunk.end_time,
                'distance': float(dist)
            } 
            for chunk, dist in relevant_chunks
        ]
    }