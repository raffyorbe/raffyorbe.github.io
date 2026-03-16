document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".floating-navbar a");

  //Hello message
  const loader = document.getElementById("typing-loader");
  const greeting = document.getElementById("greeting");
  const headline = document.getElementById("headline");

  function restartTypingAnimation() { //Restart animation on site revisit
    loader.style.animation = "none";
    void loader.offsetWidth;
    loader.style.animation = "";
    greeting.classList.remove("show");
    headline.classList.remove("show");
    void greeting.offsetWidth;
    void headline.offsetWidth;
    loader.style.display = "flex";
  }

  setTimeout(() => {
  loader.style.display = "none";
  greeting.classList.add("show");
  }, 2000);

  setTimeout(() => {
  headline.classList.add("show");
  }, 2000);

  document.addEventListener("DOMContentLoaded", restartTypingAnimation);

  window.addEventListener("pageshow", (event) => {
  if (event.persisted) restartTypingAnimation();
});

  //Nav bar scroll listener

  function getCurrentSectionId() {
    let scrollPos = window.scrollY + window.innerHeight / 3;

    for (let section of sections) {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (scrollPos >= top && scrollPos < bottom) {
        return section.id;
      }
    }

    return null;
  }

  function onScroll() {
    const currentSectionId = getCurrentSectionId();

    navLinks.forEach(link => {
      const dataTargets = link.getAttribute("data-targets");

      // If data-targets is present, split and check
      if (dataTargets) {
        const targets = dataTargets.split(",");
        if (targets.includes(currentSectionId)) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      } 
      else {
        // Fallback to href-based matching
        const href = link.getAttribute("href");
        const targetId = href.startsWith("#") ? href.slice(1) : null;

        if (targetId === currentSectionId) {
          link.classList.add("active");
        } 
        else {
          link.classList.remove("active");
        }
      }
    });
  }

  window.addEventListener("scroll", onScroll);
  onScroll(); // run on page load

  // AI chat glow

  const glow = document.querySelector('.hello-chat-border-wrapper .border-animator-chat');

  if (glow) {
  const target = document.querySelector('.hello-chat-border-wrapper');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          glow.classList.add('visible'); // start glow animation
          observer.unobserve(entry.target); // optional: only trigger once
        }
      });
    },
    {
      root: null, // use viewport as root
      threshold: 0, // we’ll rely on rootMargin instead
      rootMargin: '-30% 0px -30% 0px' 
      // top and bottom margins shrink the "trigger zone" to the center 10% of the screen
    }
  );
  observer.observe(target);
  }

  // Setup AI chat response UI

  const inputWrapper = document.querySelector('.hello-chat-border-wrapper');

  // create overlay container if not exists
  let overlayContainer = inputWrapper.querySelector('#chat-overlay-container');
  if (!overlayContainer) {
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'chat-overlay-container';
    inputWrapper.appendChild(overlayContainer);
  }

  // ChatGPT integration
  // Elements
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  // Function to add AI message bubble
  function addAIBubble(message, isLoading = false) {
    if (!overlayContainer) return null; // return null if no container
    overlayContainer.innerHTML = "";

    const bubble = document.createElement("div");
    bubble.className = "chat-overlay" + (isLoading ? " loading" : "");

    // Create message container
    const textElem = document.createElement("div");
    textElem.className = "chat-text";

    if (isLoading) {
      // typing animation
      textElem.innerHTML = `<span class="typing">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>`;
    } else {
      textElem.textContent = message;
    }
    bubble.appendChild(textElem);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "chat-close";
    closeBtn.textContent = "×";
    bubble.appendChild(closeBtn);

    // Close fade-out
    closeBtn.addEventListener("click", () => {
      bubble.classList.add("hide");
      bubble.addEventListener("transitionend", () => bubble.remove(), { once: true });
    });

    overlayContainer.appendChild(bubble);

    // Trigger fade-in
    requestAnimationFrame(() => bubble.classList.add("show"));

    return bubble;
  }

  // Remove loading bubble
  function removeLoadingBubble() {
    const loading = overlayContainer.querySelector(".chat-overlay.loading");
    if (loading) loading.remove();
  }

  // Send message
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    userInput.disabled = true;
    sendBtn.disabled = true;

    // Show loading bubble
    const bubble = addAIBubble("", true);

    try {
      const response = await fetch("https://raffyorbe-github-io.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, something went wrong. 😅";

      const textElem = bubble.querySelector(".chat-text");
      if (textElem) {
        textElem.textContent = aiMessage;

        // Add fade animation for new message
        textElem.classList.add("fade-in");
        setTimeout(() => textElem.classList.remove("fade-in"), 400);
      }

      bubble.classList.remove("loading");
    } 
    
    catch (error) {
      const textElem = bubble.querySelector(".chat-text");
      if (textElem) {
        textElem.textContent = "Error connecting to the server. 😵";

        // Fade-in for the error as well
        textElem.classList.add("fade-in");
        setTimeout(() => textElem.classList.remove("fade-in"), 400);
      }

      console.error(error);

    } 
    
    finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.value = "";
      userInput.focus();
    }

  }

  // Placeholder change
  const input = document.getElementById("user-input");
  const placeholderEl = document.getElementById("placeholder");

  const placeholders = [
    "Ask me anything",
    "Ask me how I design products",
    "Ask me about my skills",
    "Ask me about my work's impact",
    "Ask me how I collaborate",
    "Ask me about my work habits",
    "Ask me about my projects",
    "Ask me about my learning style",
    "Ask me what managers say about me",
    "Ask me about work authorization"
  ];

  let index = 0;

  placeholderEl.textContent = placeholders[index];

  function hidePlaceholder() {
    placeholderEl.classList.add("hidden");
  }

  function showPlaceholder() {
    if (input.value === "") {
      placeholderEl.classList.remove("hidden");
    }
  }

  input.addEventListener("focus", hidePlaceholder);
  input.addEventListener("blur", showPlaceholder);

  setInterval(() => {
    if (input.value !== "") return;

    placeholderEl.classList.add("hidden");

    placeholderEl.addEventListener("transitionend", function handler() {
      placeholderEl.removeEventListener("transitionend", handler);

      index = (index + 1) % placeholders.length;
      placeholderEl.textContent = placeholders[index];

      requestAnimationFrame(() => {
        if (input !== document.activeElement) {
          placeholderEl.classList.remove("hidden");
        }
      });
    });

  }, 3000); // Duration of rotation in ms

  // Event listeners
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

});
