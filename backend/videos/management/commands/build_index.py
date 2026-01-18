"""
Management command to build FAISS index from all transcript chunks.
Usage: python manage.py build_index
"""
import json
import numpy as np
import faiss
from django.core.management.base import BaseCommand
from videos.models import TranscriptChunk
from videos.embeddings import embed_chunks, FAISS_INDEX_PATH, CHUNK_MAPPING_PATH

class Command(BaseCommand):
    help = "Build FAISS index from all transcript chunks in the database."

    def handle(self, *args, **options):
        """Runs when the command is executed."""

        # Get all transcript chunks from the database
        self.stdout.write("Loading chunks from database...")
        chunks = list(TranscriptChunk.objects.all().order_by('id'))

        if not chunks:
            self.stdout.write(self.style.WARNING("No chunks found. Upload and transcribe videos first."))
            return
        
        self.stdout.write(f"Found {len(chunks)} chunks.")
        
        # Convert all chunks to embeddings
        self.stdout.write("Generating embeddings...")
        embeddings = embed_chunks(chunks)

        # Build FAISS index
        self.stdout.write("Building FAISS index...")
        dimension = len(embeddings[0]) # 384 for 'all-MiniLM-L6-v2'
        index = faiss.IndexFlatL2(dimension)

        # Convert to numpy array for FAISS
        embeddings_array = np.array(embeddings).astype('float32')
        index.add(embeddings_array)

        # Save FAISS index to disk
        faiss.write_index(index, FAISS_INDEX_PATH)
        self.stdout.write(self.style.SUCCESS(f"FAISS index saved to {FAISS_INDEX_PATH}"))

        # Save mapping (FAISS position -> chunk ID)
        mapping = {i: chunk.id for i, chunk in enumerate(chunks)}
        with open(CHUNK_MAPPING_PATH, 'w') as f:
            json.dump(mapping, f)
        self.stdout.write(self.style.SUCCESS(f"Chunk mapping saved to {CHUNK_MAPPING_PATH}"))

        self.stdout.write(self.style.SUCCESS(f"Index built with {len(chunks)} chunks!"))