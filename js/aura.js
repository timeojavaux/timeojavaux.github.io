// Liste de couleurs modernes et "espace" (bleu, violet, rose, vert néon)
const colors = ['#3b82f6', '#a855f7', '#ec4899', '#22c55e', '#eab308'];

// Sélectionne toutes les cartes
const cards = document.querySelectorAll('.card');

cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        // Choisit une couleur au hasard dans la liste
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        // Applique cette couleur à la variable CSS de la carte survolée
        card.style.setProperty('--aura-color', randomColor);
    });
});