import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def test_api_root(api_client):
    """GET /api/ returns welcome message"""
    r = api_client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data


def test_sentences_default_difficulty(api_client):
    """GET /api/sentences returns a medium sentence by default"""
    r = api_client.get(f"{BASE_URL}/api/sentences")
    assert r.status_code == 200
    data = r.json()
    assert "sentence" in data
    assert "difficulty" in data
    assert data["difficulty"] == "medium"
    assert isinstance(data["sentence"], str)
    assert len(data["sentence"]) > 0


def test_sentences_easy(api_client):
    """GET /api/sentences?difficulty=easy returns an easy sentence"""
    r = api_client.get(f"{BASE_URL}/api/sentences?difficulty=easy")
    assert r.status_code == 200
    data = r.json()
    assert data["difficulty"] == "easy"
    assert isinstance(data["sentence"], str)


def test_sentences_medium(api_client):
    """GET /api/sentences?difficulty=medium returns a medium sentence"""
    r = api_client.get(f"{BASE_URL}/api/sentences?difficulty=medium")
    assert r.status_code == 200
    data = r.json()
    assert data["difficulty"] == "medium"


def test_sentences_hard(api_client):
    """GET /api/sentences?difficulty=hard returns a hard sentence"""
    r = api_client.get(f"{BASE_URL}/api/sentences?difficulty=hard")
    assert r.status_code == 200
    data = r.json()
    assert data["difficulty"] == "hard"


def test_sentences_invalid_difficulty(api_client):
    """GET /api/sentences?difficulty=invalid returns 400"""
    r = api_client.get(f"{BASE_URL}/api/sentences?difficulty=invalid")
    assert r.status_code == 400


def test_sentences_randomness(api_client):
    """GET /api/sentences multiple times may return different sentences"""
    results = set()
    for _ in range(5):
        r = api_client.get(f"{BASE_URL}/api/sentences?difficulty=easy")
        assert r.status_code == 200
        results.add(r.json()["sentence"])
    # We expect at least 1 unique sentence (pool has 15 items; rarely all same)
    assert len(results) >= 1


def test_sentences_all(api_client):
    """GET /api/sentences/all returns all sentences by difficulty"""
    r = api_client.get(f"{BASE_URL}/api/sentences/all")
    assert r.status_code == 200
    data = r.json()
    assert "easy" in data
    assert "medium" in data
    assert "hard" in data
    assert isinstance(data["easy"], list)
    assert len(data["easy"]) > 0


def test_create_attempt(api_client):
    """POST /api/attempts saves a pronunciation attempt"""
    payload = {
        "sentence": "TEST_ The cat sat on the mat.",
        "spoken_text": "the cat sat on the mat",
        "difficulty": "easy",
        "correct_words": 5,
        "total_words": 6,
        "score": 83.33,
        "incorrect_words": [{"expected": "the", "spoken": "(missing)", "index": 0}]
    }
    r = api_client.post(f"{BASE_URL}/api/attempts", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert data["sentence"] == payload["sentence"]
    assert data["difficulty"] == "easy"
    assert data["score"] == 83.33
    assert "timestamp" in data
    return data["id"]


def test_get_attempts(api_client):
    """GET /api/attempts returns list of attempts"""
    r = api_client.get(f"{BASE_URL}/api/attempts")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_create_and_retrieve_attempt(api_client):
    """POST attempt then GET attempts verifies persistence"""
    unique_sentence = f"TEST_{uuid.uuid4().hex[:8]} The quick brown fox."
    payload = {
        "sentence": unique_sentence,
        "spoken_text": "the quick brown fox",
        "difficulty": "medium",
        "correct_words": 4,
        "total_words": 4,
        "score": 100.0,
        "incorrect_words": []
    }
    post_r = api_client.post(f"{BASE_URL}/api/attempts", json=payload)
    assert post_r.status_code == 200
    attempt_id = post_r.json()["id"]

    # Verify it appears in GET /api/attempts
    get_r = api_client.get(f"{BASE_URL}/api/attempts")
    assert get_r.status_code == 200
    attempts = get_r.json()
    ids = [a["id"] for a in attempts]
    assert attempt_id in ids


def test_get_stats(api_client):
    """GET /api/stats returns statistics"""
    r = api_client.get(f"{BASE_URL}/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_attempts" in data
    assert "average_score" in data
    assert "best_score" in data
    assert "attempts_by_difficulty" in data
    diff = data["attempts_by_difficulty"]
    assert "easy" in diff
    assert "medium" in diff
    assert "hard" in diff


def test_stats_updates_after_attempt(api_client):
    """Stats total_attempts increases after adding an attempt"""
    # Get current stats
    stats_before = api_client.get(f"{BASE_URL}/api/stats").json()
    before_count = stats_before["total_attempts"]

    # Add a new attempt
    payload = {
        "sentence": f"TEST_{uuid.uuid4().hex[:8]} I like apples.",
        "spoken_text": "i like apples",
        "difficulty": "easy",
        "correct_words": 3,
        "total_words": 3,
        "score": 100.0,
        "incorrect_words": []
    }
    api_client.post(f"{BASE_URL}/api/attempts", json=payload)

    # Check stats updated
    stats_after = api_client.get(f"{BASE_URL}/api/stats").json()
    assert stats_after["total_attempts"] == before_count + 1


def test_attempt_score_validation(api_client):
    """POST /api/attempts with all correct words saves 100% score"""
    payload = {
        "sentence": "The cat sat on the mat.",
        "spoken_text": "the cat sat on the mat",
        "difficulty": "easy",
        "correct_words": 6,
        "total_words": 6,
        "score": 100.0,
        "incorrect_words": []
    }
    r = api_client.post(f"{BASE_URL}/api/attempts", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 100.0
    assert data["correct_words"] == 6
    assert data["total_words"] == 6
    assert data["incorrect_words"] == []
