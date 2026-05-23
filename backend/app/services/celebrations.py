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
        "clipUrl": "/celebrations/mbappe-arms.mov",
        "referenceImageUrl": "/celebrations/mbappe-arms-ref.jpg",
    },
    {
        "id": "haaland-zen",
        "name": "Haaland Meditation",
        "clipUrl": "/celebrations/haaland-zen.mp4",
        "referenceImageUrl": "/celebrations/haaland-zen-ref.jpg",
    },
    {
        "id": "crowd-pump",
        "name": "The Crowd Pump",
        "clipUrl": "/celebrations/crowd-pump.mp4",
        "referenceImageUrl": "/celebrations/crowd-pump-ref.jpg",
    },
    {
        "id": "the-griddy",
        "name": "The Griddy",
        "clipUrl": "/celebrations/the-griddy.mp4",
        "referenceImageUrl": "/celebrations/the-griddy-ref.jpg",
    },
    {
        "id": "knee-slide",
        "name": "Knee Slide",
        "clipUrl": "/celebrations/knee-slide.mp4",
        "referenceImageUrl": "/celebrations/knee-slide-ref.jpg",
    },
    {
        "id": "screen-celebration",
        "name": "The Screen Celebration",
        "clipUrl": "/celebrations/screen-celebration.mov",
        "referenceImageUrl": "/celebrations/screen-celebration-ref.jpg",
    },
]


def pick_random_celebration() -> dict:
    return random.choice(CELEBRATIONS)
