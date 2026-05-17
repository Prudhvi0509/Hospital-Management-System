// Hospital Appointment System - Premium Animations Module
// Cool animations, micro-interactions, and visual effects

// ═══════════════════════════════════════════════════════════════════════
// ANIMATED NUMBER COUNTER
// ═══════════════════════════════════════════════════════════════════════
function animateCounter(element, targetValue, duration = 2000) {
    if (!element) return;

    const startValue = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation (ease-out-expo)
        const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutExpo);

        element.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue.toLocaleString();
            // Add a subtle bounce effect when done
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 150);
        }
    }

    requestAnimationFrame(updateCounter);
}

// Animate all dashboard counters
function animateDashboardCounters() {
    const counters = [
        { id: 'total-appointments', delay: 0 },
        { id: 'total-patients', delay: 200 },
        { id: 'total-doctors', delay: 400 },
        { id: 'total-departments', delay: 600 }
    ];

    counters.forEach(({ id, delay }) => {
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                const value = parseInt(element.textContent) || 0;
                element.textContent = '0';
                animateCounter(element, value, 1500);
            }
        }, delay);
    });
}

// ═══════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES BACKGROUND
// ═══════════════════════════════════════════════════════════════════════
function createParticles() {
    // Check if particles already exist
    if (document.getElementById('particles-container')) return;

    const container = document.createElement('div');
    container.id = 'particles-container';
    container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  `;
    document.body.prepend(container);

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        createParticle(container, i);
    }
}

function createParticle(container, index) {
    const particle = document.createElement('div');
    const size = Math.random() * 6 + 2;
    const duration = Math.random() * 25 + 15;
    const delay = Math.random() * 15;
    const hue = Math.random() > 0.5 ? 174 : 186; // Teal to cyan range

    particle.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    background: hsla(${hue}, 73%, 40%, ${Math.random() * 0.4 + 0.1});
    border-radius: 50%;
    left: ${Math.random() * 100}%;
    top: ${Math.random() * 100}%;
    animation: floatParticle${index % 3} ${duration}s ease-in-out infinite;
    animation-delay: -${delay}s;
    filter: blur(${Math.random() * 1}px);
    box-shadow: 0 0 ${size * 2}px hsla(${hue}, 73%, 40%, 0.3);
  `;

    container.appendChild(particle);
}

// Add particle animation keyframes dynamically
function addParticleStyles() {
    if (document.getElementById('particle-styles')) return;

    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
    @keyframes floatParticle0 {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.3;
      }
      25% {
        transform: translate(50px, -80px) scale(1.2);
        opacity: 0.6;
      }
      50% {
        transform: translate(-30px, -150px) scale(0.8);
        opacity: 0.4;
      }
      75% {
        transform: translate(60px, -80px) scale(1.1);
        opacity: 0.7;
      }
    }
    
    @keyframes floatParticle1 {
      0%, 100% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 0.4;
      }
      33% {
        transform: translate(-40px, -100px) rotate(120deg);
        opacity: 0.7;
      }
      66% {
        transform: translate(30px, -180px) rotate(240deg);
        opacity: 0.3;
      }
    }
    
    @keyframes floatParticle2 {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.2;
      }
      50% {
        transform: translate(-60px, -120px) scale(1.5);
        opacity: 0.5;
      }
    }
    
    @keyframes progressFill {
      from { width: 0%; }
      to { width: var(--final-width, 100%); }
    }
    
    .counter-animate {
      transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .ripple-effect {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: rippleAnimation 0.6s ease-out forwards;
      pointer-events: none;
    }
    
    @keyframes rippleAnimation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    .bounce-in {
      animation: bounceInAnim 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    @keyframes bounceInAnim {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .slide-up-anim {
      animation: slideUpAnim 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes slideUpAnim {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .glow-pulse {
      animation: glowPulse 2s ease-in-out infinite;
    }
    
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(13, 148, 136, 0.3); }
      50% { box-shadow: 0 0 40px rgba(13, 148, 136, 0.6); }
    }
    
    .icon-spin {
      animation: iconSpin 0.5s ease-out;
    }
    
    @keyframes iconSpin {
      from { transform: rotate(0deg) scale(0.5); }
      to { transform: rotate(360deg) scale(1); }
    }
    
    @keyframes shrinkProgress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Interactive card glow */
    .interactive-glow {
      position: absolute;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(13, 148, 136, 0.2) 0%, transparent 70%);
      pointer-events: none;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 0;
      border-radius: 50%;
      filter: blur(10px);
    }
    
    .card:hover .interactive-glow,
    .dashboard-card:hover .interactive-glow {
      opacity: 1;
    }
  `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// MOUSE-FOLLOWING GLOW EFFECT
// ═══════════════════════════════════════════════════════════════════════
function initializeCardGlowEffect() {
    document.querySelectorAll('.card, .dashboard-card, .glass-card').forEach(card => {
        // Add glow element if not exists
        if (!card.querySelector('.interactive-glow')) {
            const glow = document.createElement('div');
            glow.className = 'interactive-glow';
            card.style.position = 'relative';
            card.style.overflow = 'hidden';
            card.prepend(glow);
        }

        card.addEventListener('mousemove', (e) => {
            const glow = card.querySelector('.interactive-glow');
            if (!glow) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            glow.style.left = x + 'px';
            glow.style.top = y + 'px';
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════
// BUTTON RIPPLE EFFECT
// ═══════════════════════════════════════════════════════════════════════
function initializeRippleEffect() {
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.btn');
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);

        ripple.className = 'ripple-effect';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - size / 2 + 'px';

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
}

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED STAGGERED ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════
function initializeStaggeredAnimations() {
    // Dashboard cards stagger effect
    document.querySelectorAll('.dashboard-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px) scale(0.9)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, 100 + index * 150);
    });

    // Nav sections stagger
    document.querySelectorAll('.nav-section').forEach((nav, index) => {
        nav.style.opacity = '0';
        nav.style.transform = 'translateY(20px)';

        setTimeout(() => {
            nav.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            nav.style.opacity = '1';
            nav.style.transform = 'translateY(0)';
        }, 300 + index * 100);
    });

    // Cards in other sections
    document.querySelectorAll('.section-card, .card').forEach((card, index) => {
        if (card.classList.contains('dashboard-card')) return; // Skip dashboard cards

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(30px)';

                    setTimeout(() => {
                        card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(card);
    });
}

// ═══════════════════════════════════════════════════════════════════════
// SMOOTH SCROLL ENHANCEMENT
// ═══════════════════════════════════════════════════════════════════════
function initializeSmoothScroll() {
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════
// PARALLAX EFFECT FOR HERO
// ═══════════════════════════════════════════════════════════════════════
function initializeParallax() {
    const hero = document.querySelector('header.bg-primary');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.3;

        hero.style.backgroundPosition = `center ${rate}px`;
    });
}

// ═══════════════════════════════════════════════════════════════════════
// MAGNETIC BUTTON EFFECT
// ═══════════════════════════════════════════════════════════════════════
function initializeMagneticButtons() {
    document.querySelectorAll('.btn-primary, .btn-success').forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════
// TILT EFFECT FOR CARDS
// ═══════════════════════════════════════════════════════════════════════
function initializeTiltEffect() {
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            card.style.transition = 'transform 0.5s ease';
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.1s ease';
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════
// LOADING SKELETON ANIMATION
// ═══════════════════════════════════════════════════════════════════════
function showSkeletonLoader(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
      <div class="skeleton-item mb-3" style="animation-delay: ${i * 0.1}s">
        <div class="loading-skeleton" style="height: 20px; width: ${80 + Math.random() * 20}%; margin-bottom: 8px;"></div>
        <div class="loading-skeleton" style="height: 14px; width: ${60 + Math.random() * 30}%;"></div>
      </div>
    `;
    }
    container.innerHTML = skeletons;
}

// ═══════════════════════════════════════════════════════════════════════
// TEXT TYPING EFFECT
// ═══════════════════════════════════════════════════════════════════════
function typeText(element, text, speed = 50) {
    if (!element) return;

    element.textContent = '';
    let i = 0;

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// ═══════════════════════════════════════════════════════════════════════
// CONFETTI CELEBRATION EFFECT
// ═══════════════════════════════════════════════════════════════════════
function showConfetti() {
    const colors = ['#0D9488', '#14B8A6', '#06B6D4', '#0EA5E9', '#059669'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
}

function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    const size = Math.random() * 10 + 5;

    confetti.style.cssText = `
    position: fixed;
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    left: ${Math.random() * 100}vw;
    top: -20px;
    border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
    pointer-events: none;
    z-index: 9999;
    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
    transform: rotate(${Math.random() * 360}deg);
  `;

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
}

// Add confetti animation
function addConfettiStyles() {
    if (document.getElementById('confetti-styles')) return;

    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
  `;
    document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// INITIALIZE ALL ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════
function initializeAnimations() {
    // Add all necessary styles
    addParticleStyles();
    addConfettiStyles();

    // Create floating particles
    createParticles();

    // Initialize effects with slight delay for DOM readiness
    setTimeout(() => {
        initializeCardGlowEffect();
        initializeRippleEffect();
        initializeStaggeredAnimations();
        initializeSmoothScroll();
        initializeParallax();
        initializeMagneticButtons();
        initializeTiltEffect();
    }, 100);

    // Animate dashboard counters after data loads
    setTimeout(() => {
        animateDashboardCounters();
    }, 500);
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
    initializeAnimations();
}

// Re-initialize when section changes
const originalShowSection = window.showSection;
if (typeof originalShowSection === 'function') {
    window.showSection = function (sectionName, event) {
        originalShowSection(sectionName, event);

        // Re-run animations for the new section
        setTimeout(() => {
            initializeCardGlowEffect();
            initializeTiltEffect();

            // Animate counters if switching to dashboard
            if (sectionName === 'dashboard') {
                setTimeout(() => animateDashboardCounters(), 300);
            }
        }, 100);
    };
}

// Export for external use
window.animateCounter = animateCounter;
window.showConfetti = showConfetti;
window.typeText = typeText;
window.showSkeletonLoader = showSkeletonLoader;
