<script>
  import { Button } from '@repo/ui/button';
  
  let isOpen = $state(false);
  
  function toggleMenu() {
    isOpen = !isOpen;
  }
</script>

<!-- Mobile menu button -->
<button 
  class="md:hidden p-2 rounded-lg hover:bg-muted transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" 
  onclick={toggleMenu}
  aria-label="Open mobile menu"
>
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>

<!-- Mobile menu overlay -->
{#if isOpen}
  <div class="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm" onclick={toggleMenu}>
    <div class="fixed top-0 left-0 right-0 bg-background border-b" onclick={(e) => e.stopPropagation()}>
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">🎙️</div>
            <span class="text-xl font-semibold">Whispering</span>
          </div>
          <button 
            class="p-2 rounded-lg hover:bg-muted transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" 
            onclick={toggleMenu}
            aria-label="Close mobile menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav class="mt-8 space-y-4">
          <a href="#features" onclick={toggleMenu} class="block px-4 py-3 text-lg font-medium hover:bg-muted rounded-lg transition-colors">
            Features
          </a>
          <a href="#pricing" onclick={toggleMenu} class="block px-4 py-3 text-lg font-medium hover:bg-muted rounded-lg transition-colors">
            Pricing
          </a>
          <a href="#download" onclick={toggleMenu} class="block px-4 py-3 text-lg font-medium hover:bg-muted rounded-lg transition-colors">
            Download
          </a>
          
          <div class="pt-4 pb-6 border-t space-y-3">
            <Button href="https://github.com/epicenter-so/epicenter/tree/main/apps/whispering" variant="ghost" class="w-full justify-start">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
            <Button href="https://whispering.bradenwong.com" variant="outline" class="w-full justify-start">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
              Launch Web
              <svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </Button>
          </div>
        </nav>
      </div>
    </div>
  </div>
{/if}