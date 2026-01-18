
/**
 * GradientText Component
 * Adapts React functionality to Vanilla JS.
 */
export default class GradientText {
    constructor(element, options = {}) {
        this.element = element;
        this.colors = options.colors || ["#5227FF", "#FF9FFC", "#B19EEF"];
        this.animationSpeed = options.animationSpeed || 7; // Duration in seconds typically, but we'll adapt to match "speed" feel
        this.showBorder = options.showBorder || false;
        this.className = options.className || '';

        this.init();
    }

    init() {
        if (!this.element) return;

        // Apply class name if provided
        if (this.className) {
            this.element.classList.add(this.className);
        }

        // Basic styling to enable background clip
        this.element.style.backgroundClip = 'text';
        this.element.style.webkitBackgroundClip = 'text';
        this.element.style.webkitTextFillColor = 'transparent';
        this.element.style.color = 'transparent'; // Fallback

        // Setup gradient
        // To make it seamless, we duplicate the first color at the end
        const gradientColors = [...this.colors, this.colors[0]].join(', ');
        this.element.style.backgroundImage = `linear-gradient(to right, ${gradientColors})`;
        this.element.style.backgroundSize = '300% 100%';

        // Animation
        // "Speed" 7 in the screenshot likely refers to duration like 7s or speed factor. 
        // We'll treat it as duration in seconds for a full loop to match standard CSS animation feel.
        const duration = this.animationSpeed;

        // Check if style sheet exists for this component or create one
        let styleSheet = document.getElementById('gradient-text-styles');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'gradient-text-styles';
            styleSheet.textContent = `
                @keyframes gradient-text-animation {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        this.element.style.animation = `gradient-text-animation ${duration}s linear infinite alternate`;

        // Border implementation (if requested)
        if (this.showBorder) {
            this.element.style.border = '2px solid transparent';
            this.element.style.borderImage = `linear-gradient(to right, ${gradientColors}) 1`;
            // Note: Border gradient animation is complex in vanilla CSS without extra divs, 
            // but the prompt emphasized the text effect. 
            // We'll keep it simple for now as the screenshot set showBorder={false}.
        }
    }
}
