import random

CELEBRATIONS = [
    {
        "id": "ronaldo-siuu",
        "name": "Ronaldo SIUU",
        "clipUrl": "/celebrations/ronaldo-siuu.mp4",
        "referenceImageUrl": "/celebrations/ronaldo-siuu-ref.jpg",
    },
    {
        "id": "mbappe-arms",
        "name": "Mbappe Arms Crossed",
        "clipUrl": "/celebrations/mbappe-arms.mp4",
        "referenceImageUrl": "/celebrations/mbappe-arms-ref.jpg",
    },
    {
        "id": "messi-wide",
        "name": "Messi Arms Wide",
        "clipUrl": "/celebrations/messi-wide.mp4",
        "referenceImageUrl": "/celebrations/messi-wide-ref.jpg",
    },
]


def pick_random_celebration() -> dict:
    return random.choice(CELEBRATIONS)
