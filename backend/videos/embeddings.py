import json
import os
import numpy as np
import faiss
from django.conf import settings
from .models import TranscriptChunk
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

FAISS_INDEX_PATH = os.path.join(settings.MEDIA_ROOT, 'faiss_index.bin')
CHUNK_MAPPING_PATH = os.path.join(settings.MEDIA_ROOT, 'chunk_mapping.json')

def embed_text(text):
    """
    Generate embeddings for the given text using a pre-trained SentenceTransformer model.
    Returns a list of floats representing the embedding vector.
    """
    embedding = model.encode(text)
    return embedding.tolist()

def embed_chunks(chunks):
    """
    Batch embed multiple chunks efficiently.
    Returns a list of embedding vectors.
    """
    texts = [chunk.text for chunk in chunks]
    return model.encode(texts, batch_size=32, show_progress_bar=True).tolist()

def search_chunks(query, top_k=5):
    """
    Search for the most relevant transcript chunks given a query.
    Returns a list of (chunk, distance) tuples sorted by similarity.
    """
    if not os.path.exists(FAISS_INDEX_PATH):
        raise FileNotFoundError(
            "FAISS index not found. Run 'python manage.py build_index' first."
        )
    if not os.path.exists(CHUNK_MAPPING_PATH):
        raise FileNotFoundError(
            "Chunk mapping not found. Run 'python manage.py build_index' first."
        )
    
    # Load FAISS index
    index = faiss.read_index(FAISS_INDEX_PATH)
    
    # Load chunk mapping
    with open(CHUNK_MAPPING_PATH, 'r') as f:
        chunk_mapping = json.load(f)
    
    # Embed the query
    query_vector = embed_text(query)
    query_embedding = np.array([query_vector]).astype('float32')

    # Search in FAISS index
    distances, indices = index.search(query_embedding, top_k)
    
    # Convert FAISS positions back to TranscriptChunk objects
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        chunk_id = chunk_mapping[str(idx)]
        chunk = TranscriptChunk.objects.get(id=chunk_id)
        results.append((chunk, float(dist)))
    
    return results