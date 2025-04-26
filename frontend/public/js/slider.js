/**
 * Simple Slider Component
 * Used for creating horizontal sliders with navigation
 */

document.addEventListener('DOMContentLoaded', function() {
  initSpeakersSlider();
});

function initSpeakersSlider() {
  const sliderContainer = document.querySelector('.speakers-slider-container');
  if (!sliderContainer) return;
  
  const slider = sliderContainer.querySelector('.speakers-slider');
  const prevButton = sliderContainer.querySelector('.slider-prev');
  const nextButton = sliderContainer.querySelector('.slider-next');
  const items = slider.querySelectorAll('.speaker-card');
  const paginationDots = document.querySelectorAll('.speakers-slider-pagination button');
  
  if (items.length <= 3) {
    // Hide navigation if not enough items
    if (prevButton) prevButton.classList.add('hidden');
    if (nextButton) nextButton.classList.add('hidden');
    return;
  }
  
  // Show navigation
  if (prevButton) prevButton.classList.remove('hidden');
  if (nextButton) nextButton.classList.remove('hidden');
  
  // Calculate the width to scroll
  const itemWidth = items[0].offsetWidth;
  const gap = 32; // Matches the gap-8 (2rem = 32px) in the grid
  const scrollAmount = itemWidth + gap;
  
  // Set initial state
  prevButton.disabled = true;
  let currentPosition = 0;
  let currentPage = 0;
  const itemsPerPage = 3; // Number of items visible at once
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  // Initialize pagination dots if they exist
  if (paginationDots.length > 0) {
    // Ensure we have the correct number of dots
    updatePaginationDots();
  }
  
  // Event listeners for navigation
  prevButton.addEventListener('click', function() {
    currentPosition = Math.max(currentPosition - scrollAmount, 0);
    slider.scrollTo({
      left: currentPosition,
      behavior: 'smooth'
    });
    
    // Update button states and pagination
    updateButtonStates();
    updateCurrentPage();
  });
  
  nextButton.addEventListener('click', function() {
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
    currentPosition = Math.min(currentPosition + scrollAmount, maxScrollLeft);
    slider.scrollTo({
      left: currentPosition,
      behavior: 'smooth'
    });
    
    // Update button states and pagination
    updateButtonStates();
    updateCurrentPage();
  });
  
  // Listen for scroll events to update button states
  slider.addEventListener('scroll', function() {
    currentPosition = slider.scrollLeft;
    updateButtonStates();
    updateCurrentPage();
  });
  
  function updateButtonStates() {
    // Disable prev button if at the beginning
    prevButton.disabled = currentPosition <= 0;
    prevButton.classList.toggle('opacity-50', currentPosition <= 0);
    
    // Disable next button if at the end
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
    nextButton.disabled = currentPosition >= maxScrollLeft;
    nextButton.classList.toggle('opacity-50', currentPosition >= maxScrollLeft);
  }
  
  function updateCurrentPage() {
    // Calculate current page based on scroll position
    const maxScrollWidth = slider.scrollWidth - slider.clientWidth;
    currentPage = maxScrollWidth === 0 ? 0 : Math.round((currentPosition / maxScrollWidth) * (totalPages - 1));
    
    // Update pagination dots if they exist
    updatePaginationDotsSelection();
  }
  
  function updatePaginationDots() {
    const paginationContainer = document.querySelector('.flex.justify-center.mt-6.space-x-2');
    if (!paginationContainer) return;
    
    // Clear existing dots
    paginationContainer.innerHTML = '';
    
    // Create the correct number of dots
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = i === 0 ? 'w-3 h-3 rounded-full bg-blue-600' : 'w-3 h-3 rounded-full bg-gray-300';
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.dataset.page = i;
      
      // Add click event to navigate to the page
      dot.addEventListener('click', function() {
        const page = parseInt(this.dataset.page);
        goToPage(page);
      });
      
      paginationContainer.appendChild(dot);
    }
  }
  
  function updatePaginationDotsSelection() {
    const dots = document.querySelectorAll('.flex.justify-center.mt-6.space-x-2 button');
    if (!dots.length) return;
    
    // Update dots' active state
    dots.forEach((dot, index) => {
      if (index === currentPage) {
        dot.classList.remove('bg-gray-300');
        dot.classList.add('bg-blue-600');
      } else {
        dot.classList.remove('bg-blue-600');
        dot.classList.add('bg-gray-300');
      }
    });
  }
  
  function goToPage(page) {
    // Calculate position for the page
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
    const pageScrollPosition = page * (maxScrollLeft / (totalPages - 1));
    
    // Set scroll position
    currentPosition = pageScrollPosition;
    slider.scrollTo({
      left: currentPosition,
      behavior: 'smooth'
    });
    
    // Update states
    updateButtonStates();
    updateCurrentPage();
  }
  
  // Initialize by calling update once
  updateButtonStates();
  updateCurrentPage();
  
  // Handle window resize
  window.addEventListener('resize', function() {
    // Recalculate scroll amount
    const newItemWidth = items[0].offsetWidth;
    scrollAmount = newItemWidth + gap;
    
    // Reset position to avoid out-of-bounds
    currentPosition = 0;
    slider.scrollTo({
      left: 0,
      behavior: 'auto'
    });
    
    // Update everything
    updateButtonStates();
    updateCurrentPage();
  });
} 