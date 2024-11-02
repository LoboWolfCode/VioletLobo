let darkmode = localStorage.getItem('darkmode')
const themeSwitch = document.getElementById('theme-switch')

const enableDarkmode = () => {
    document.body.classList.add('darkmode')
    localStorage.setItem('darkmode', 'active')
}

const disableDarkmode = () => {
    document.body.classList.remove('darkmode')
    localStorage.setItem('darkmode', null)
}

if(darkmode === "active") enableDarkmode()

themeSwitch.addEventListener("click", () => {
    darkmode = localStorage.getItem('darkmode')
    darkmode !== "active" ? enableDarkmode() : disableDarkmode()
})




document.addEventListener('DOMContentLoaded', () => {
  const readMoreBtns = document.querySelectorAll('.read-more-btn');

  let currentExpandedBtn = null;

  readMoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const paragraph = btn.previousElementSibling;

      // Close all other expanded paragraphs
      readMoreBtns.forEach(otherBtn => {
        if (otherBtn !== btn) {
          otherBtn.previousElementSibling.classList.remove('expanded');
          otherBtn.textContent = 'Read More';
        }
      });

      // Update the current expanded button
      if (currentExpandedBtn && currentExpandedBtn !== btn) {
        currentExpandedBtn.textContent = 'Read More';
      }
      currentExpandedBtn = btn;

      const isExpanded = paragraph.classList.toggle('expanded');
      btn.textContent = isExpanded ? 'Read Less' : 'Read More';
    });
  });
});






lightbox.option({
    'resizeDuration': 200,
    'wrapAround': true
  })