import random

CELEBRATIONS = [
    {
        "id": "ronaldo-siuu",
        "name": "SIUUUU! Hit the Ronaldo Jump",
        "clipUrl": "/celebrations/ronaldo-siuu.mp4",
        "referenceImageUrl": "/celebrations/ronaldo-siuu-ref.jpg",
    },
    {
        "id": "lyon-clap",
        "name": "Slow Clap Like You Own the Pitch",
        "clipUrl": "/celebrations/lyon-clap.mov",
        "referenceImageUrl": "/celebrations/lyon-clap-ref.jpg",
    },
    {
        "id": "haaland-zen",
        "name": "Haaland's Yoga Zen Mode",
        "clipUrl": "/celebrations/haaland-zen.mp4",
        "referenceImageUrl": "/celebrations/haaland-zen-ref.jpg",
    },
    {
        "id": "neymar-heart",
        "name": "Neymar's Heart on Your Chest",
        "clipUrl": "/celebrations/neymar-heart.mp4",
        "referenceImageUrl": "/celebrations/neymar-heart-ref.jpg",
    },
    {
        "id": "alisson-dance",
        "name": "Alisson Santos Corner Flag Dance",
        "clipUrl": "/celebrations/alisson-dance.mp4",
        "referenceImageUrl": "/celebrations/alisson-dance-ref.jpg",
    },
    {
        "id": "yamal-sauce",
        "name": "Lamine Yamal's Got the Sauce",
        "clipUrl": "/celebrations/yamal-sauce.mp4",
        "referenceImageUrl": "/celebrations/yamal-sauce-ref.jpg",
    },
    {
        "id": "colombia-dance",
        "name": "Colombia Squad Group Dance",
        "clipUrl": "/celebrations/colombia-dance.mov",
        "referenceImageUrl": "/celebrations/colombia-dance-ref.jpg",
    },
]


def pick_random_celebration() -> dict:
    return random.choice(CELEBRATIONS)
