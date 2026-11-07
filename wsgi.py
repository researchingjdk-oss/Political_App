from candidatedb import CandidateHandler
import http.server

# Simple WSGI-compatible runner or use Flask/FastAPI for production APIs
if __name__ == "__main__":
    from waitress import serve
    server = http.server.HTTPServer(("", 8000), CandidateHandler)
    print("Serving globally on port 8000...")
    server.serve_forever()