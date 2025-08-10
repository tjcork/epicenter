<script>
  // Microphone hero animation component
</script>

<div class="relative inline-block mb-16 lg:mb-20">
  <!-- Ripple Effects -->
  <div class="absolute inset-0 flex items-center justify-center">
    <div class="w-32 h-32 border-2 border-primary/30 rounded-full animate-ripple"></div>
    <div class="w-32 h-32 border-2 border-primary/40 rounded-full absolute animate-ripple animation-delay-1"></div>
    <div class="w-32 h-32 border-2 border-primary/50 rounded-full absolute animate-ripple animation-delay-2"></div>
  </div>

  <!-- Orbiting Elements -->
  <div class="absolute inset-0 flex items-center justify-center">
    <div class="w-3 h-3 bg-primary rounded-full animate-orbit shadow-lg"></div>
  </div>
  <div class="absolute inset-0 flex items-center justify-center">
    <div class="w-2 h-2 bg-primary/80 rounded-full animate-orbit-reverse shadow-md"></div>
  </div>

  <!-- Microphone Icon -->
  <div class="relative z-20 text-8xl lg:text-9xl animate-pulse-gentle select-none">
    🎙️
  </div>

  <!-- Sound Waves -->
  <div class="absolute top-1/2 left-full ml-6 lg:ml-8 -translate-y-1/2 flex items-end space-x-1">
    <div class="w-2 h-4 bg-primary/40 rounded-full animate-sound-wave"></div>
    <div class="w-2 h-8 bg-primary/50 rounded-full animate-sound-wave animation-delay-200"></div>
    <div class="w-2 h-12 bg-primary/60 rounded-full animate-sound-wave animation-delay-400"></div>
    <div class="w-2 h-6 bg-primary/50 rounded-full animate-sound-wave animation-delay-600"></div>
    <div class="w-2 h-3 bg-primary/40 rounded-full animate-sound-wave animation-delay-800"></div>
  </div>

  <div class="absolute top-1/2 right-full mr-6 lg:mr-8 -translate-y-1/2 flex items-end space-x-1">
    <div class="w-2 h-3 bg-primary/40 rounded-full animate-sound-wave animation-delay-800"></div>
    <div class="w-2 h-6 bg-primary/50 rounded-full animate-sound-wave animation-delay-600"></div>
    <div class="w-2 h-12 bg-primary/60 rounded-full animate-sound-wave animation-delay-400"></div>
    <div class="w-2 h-8 bg-primary/50 rounded-full animate-sound-wave animation-delay-200"></div>
    <div class="w-2 h-4 bg-primary/40 rounded-full animate-sound-wave"></div>
  </div>

  <!-- Floating Particles -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="w-1.5 h-1.5 bg-primary/50 rounded-full absolute top-1/4 left-1/4 animate-float-particle"></div>
    <div class="w-2 h-2 bg-primary/60 rounded-full absolute top-3/4 right-1/4 animate-float-particle animation-delay-1200"></div>
    <div class="w-1.5 h-1.5 bg-primary/40 rounded-full absolute top-1/2 left-3/4 animate-float-particle animation-delay-2400"></div>
    <div class="w-2 h-2 bg-primary/50 rounded-full absolute top-1/3 right-1/3 animate-float-particle animation-delay-3600"></div>
    <div class="w-1.5 h-1.5 bg-primary/60 rounded-full absolute bottom-1/4 left-1/2 animate-float-particle animation-delay-4800"></div>
  </div>
</div>

<style>
  @keyframes ripple {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.4;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  @keyframes orbit {
    0% {
      transform: rotate(0deg) translateX(60px) rotate(0deg);
    }
    100% {
      transform: rotate(360deg) translateX(60px) rotate(-360deg);
    }
  }

  @keyframes orbit-reverse {
    0% {
      transform: rotate(0deg) translateX(35px) rotate(0deg);
    }
    100% {
      transform: rotate(-360deg) translateX(35px) rotate(360deg);
    }
  }

  @keyframes pulse-gentle {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 20px rgba(0,0,0,0.1));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 30px rgba(0,0,0,0.2));
    }
  }

  @keyframes sound-wave {
    0%, 100% {
      transform: scaleY(0.5);
      opacity: 0.4;
    }
    50% {
      transform: scaleY(1.2);
      opacity: 0.9;
    }
  }

  @keyframes float-particle {
    0% {
      transform: translateY(0px) translateX(0px) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-80px) translateX(30px) rotate(360deg);
      opacity: 0;
    }
  }

  .animate-ripple {
    animation: ripple 3s ease-out infinite;
  }

  .animate-orbit {
    animation: orbit 8s linear infinite;
  }

  .animate-orbit-reverse {
    animation: orbit-reverse 12s linear infinite reverse;
  }

  .animate-pulse-gentle {
    animation: pulse-gentle 3s ease-in-out infinite;
  }

  .animate-sound-wave {
    animation: sound-wave 1.8s ease-in-out infinite;
  }

  .animate-float-particle {
    animation: float-particle 6s ease-out infinite;
  }

  /* Animation delays */
  .animation-delay-1 {
    animation-delay: 1s;
  }

  .animation-delay-2 {
    animation-delay: 2s;
  }

  .animation-delay-200 {
    animation-delay: 0.2s;
  }

  .animation-delay-400 {
    animation-delay: 0.4s;
  }

  .animation-delay-600 {
    animation-delay: 0.6s;
  }

  .animation-delay-800 {
    animation-delay: 0.8s;
  }

  .animation-delay-1200 {
    animation-delay: 1.2s;
  }

  .animation-delay-2400 {
    animation-delay: 2.4s;
  }

  .animation-delay-3600 {
    animation-delay: 3.6s;
  }

  .animation-delay-4800 {
    animation-delay: 4.8s;
  }

  /* Mobile scaling */
  @media (max-width: 640px) {
    .microphone-container {
      transform: scale(0.8);
    }
  }
</style>