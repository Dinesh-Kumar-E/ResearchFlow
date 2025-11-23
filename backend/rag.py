import chromadb
from chromadb.utils import embedding_functions
import uuid
import os

class RAGSystem:
    def __init__(self, persist_directory="chroma_db"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        self.collection = self.client.get_or_create_collection(
            name="research_documents",
            embedding_function=self.embedding_fn
        )

    def add_document(self, text: str, source: str):
        # Simple chunking by paragraphs or fixed size
        # For tiny RAG, let's do simple fixed size chunking with overlap
        chunk_size = 1000
        overlap = 100
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += chunk_size - overlap
            
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [{"source": source} for _ in chunks]
        
        self.collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Added {len(chunks)} chunks from {source} to ChromaDB.")

    def query(self, query_text: str, n_results: int = 3):
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        # Flatten results
        documents = results['documents'][0]
        metadatas = results['metadatas'][0]
        
        formatted_results = []
        for doc, meta in zip(documents, metadatas):
            formatted_results.append(f"Source: {meta['source']}\nContent: {doc}")
            
        return "\n\n".join(formatted_results)

# Singleton instance
rag = RAGSystem()
