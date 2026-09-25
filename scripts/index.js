document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".floating-navbar a");

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
    const chatGlass = document.querySelector('.chat-glass');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            
            glow.classList.add('visible'); // start glow animation
            chatGlass.classList.add('visible');

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

  // Notification sound played when a text reply (not the loading dots) appears
  const replySound = new Audio("audio/dragon-studio-new-notification-3-398649.mp3");

  function playReplySound() {
    replySound.currentTime = 0;
    replySound.play().catch(() => {});
  }

  // Browsers only allow audio.play() for a brief window after a user gesture.
  // If the fetch below takes longer than that window, the later playReplySound()
  // call gets silently blocked. Unlocking the element here (still inside the
  // click/keydown gesture) lets it play later regardless of response time.
  function unlockReplySound() {
    // Pause synchronously, without waiting for the play() promise to resolve.
    // This stops playback before the browser actually renders audio (no blip),
    // while still satisfying the "played during a user gesture" requirement
    // that lets later, non-gesture playReplySound() calls succeed. Doing this
    // synchronously (vs. muting and unmuting inside a .then()) avoids a race
    // with a fast API response calling playReplySound() before the unlock
    // finishes, which would otherwise play the real reply muted/silent.
    const p = replySound.play();
    replySound.pause();
    replySound.currentTime = 0;
    if (p && p.catch) p.catch(() => {});
  }

  // Hero overlay switches to a frosted dark layer while a chat bubble is showing
  const heroOverlay = inputWrapper.closest('.hello-overlay');

  function setHeroChatActive(active) {
    if (heroOverlay) heroOverlay.classList.toggle('chat-active', active);
  }

  // Fade a bubble down and out and drop the frosted layer behind it. Shared by the close
  // button (on a reply) and the stop button (while loading), so both leave the same way.
  function hideBubble(bubble) {
    setHeroChatActive(false);
    bubble.classList.add("hide");

    // Remove once the bubble's own fade-down finishes. transitionend also bubbles up from
    // the glow's ring fade-in (0.9s after a reply), which would otherwise cut the fade short
    // if the bubble is closed soon after the reply lands.
    const onEnd = (e) => {
      if (e.target !== bubble) return;
      bubble.removeEventListener("transitionend", onEnd);
      bubble.remove();
    };
    bubble.addEventListener("transitionend", onEnd);
  }

  // Glow spin. The CSS animation rests at 6s per rotation (.chat-glow-spin in styles/index.css).
  // While loading it runs faster through playbackRate and eases back to rest when the reply
  // lands. Changing playbackRate, unlike changing animation-duration, keeps the glow at its
  // current angle, so it never snaps.
  const GLOW_REST_MS = 6000;   // .chat-glow-spin animation-duration in styles/index.css
  const DOTS_CYCLE_MS = 1400;  // .typing .dot blink duration in styles/index.css

  // Loading pace: two glow laps per dot cycle (0.7s per lap). A whole-number ratio keeps the
  // two locked together instead of drifting. The loading bubble is a circle, so the glow moves
  // at an even speed all the way around. The two laps in a cycle meet the dots at different
  // moments (one as they ripple, one as they rest), so the glow also breathes with the dots
  // (see .chat-glow-clip in styles/index.css) to make each pass look intended. (One lap per
  // cycle, 1.4s, and one per two cycles, 2.8s, were tried too.)
  const GLOW_LOADING_MS = DOTS_CYCLE_MS / 2;
  const GLOW_LOADING_RATE = GLOW_REST_MS / GLOW_LOADING_MS;
  const GLOW_SETTLE_MS = 900;

  // Opening swell when a reply lands: the glow rises to GLOW_REPLY_PEAK about 18% of the way in
  // (1 is full opacity, the most there is: 25% above the steady 0.8), then fades back down to
  // steady over the rest. It starts from wherever the loading breathing is, so nothing snaps.
  const GLOW_REPLY_PEAK = 1;
  const GLOW_REPLY_FLASH_MS = 1400;
  // The swell also spreads the glow outward: its blur grows from the steady 7px to this at the
  // same moment, then back, so the halo reaches further as it brightens. The blur always
  // starts and ends at the constant steady value, so this is smooth wherever loading stopped.
  // The glow's transparent margin (.chat-glow in styles/index.css) is sized to 2x this, so
  // the wider blur still fades out inside its own box.
  const GLOW_REPLY_BLUR_PEAK_PX = 12;

  // Phase lock with the typing dots. Both animations start together. The dots sit centered in
  // the bubble and ripple left to right, and along the top edge the glow also moves left to
  // right, so start the spin at the angle that puts the arc's white peak straight above the
  // dots (12 o'clock) at the ripple's peak: the brightest part of the glow passes over them in
  // the same direction as the ripple, on every lap (so twice per dot cycle).
  // The ripple's peak is when the three dots are brightest together (the sum of their
  // opacities), 630ms into the cycle. That's earlier than the middle dot's own peak (760ms)
  // because the blink's default `ease` curve rises fast. Aiming at the middle dot's peak put the
  // white ~70deg past the dots by the time the ripple peaked.
  const GLOW_WHITE_DEG = 0.69 * 360; // white stop (69%) in .chat-glow-arc
  const DOTS_ABOVE_DEG = 0;          // 12 o'clock, straight above the centered dots
  const RIPPLE_PEAK_MS = 630;        // keep in step with the 45% peak of chat-glow-breathe in styles/index.css
  const GLOW_LOADING_PHASE =
    ((((DOTS_ABOVE_DEG - GLOW_WHITE_DEG - (360 * RIPPLE_PEAK_MS) / GLOW_LOADING_MS) % 360) + 360) % 360) / 360;

  function getGlowSpin(bubble) {
    const spin = bubble.querySelector(".chat-glow-spin");
    return spin && spin.getAnimations ? spin.getAnimations()[0] : null;
  }

  function settleGlow(bubble) {
    const anim = getGlowSpin(bubble);
    if (!anim) return;
    const from = anim.playbackRate;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / GLOW_SETTLE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      anim.playbackRate = from + (1 - from) * eased;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Function to add AI message bubble
  function addAIBubble(message, isLoading = false) {
    if (!overlayContainer) return null; // return null if no container
    overlayContainer.innerHTML = "";
    setHeroChatActive(true);

    const bubble = document.createElement("div");
    bubble.className = "chat-overlay" + (isLoading ? " loading" : "");

    // Animated glow behind the bubble (see the .chat-glow comment in styles/index.css)
    const glow = document.createElement("div");
    glow.className = "chat-glow";
    glow.setAttribute("aria-hidden", "true");
    glow.innerHTML =
      '<div class="chat-glow-clip"><div class="chat-glow-spin"><div class="chat-glow-arc"></div><div class="chat-glow-color"></div></div></div>';
    bubble.appendChild(glow);

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
    closeBtn.addEventListener("click", () => hideBubble(bubble));

    overlayContainer.appendChild(bubble);

    if (isLoading) {
      const spinAnim = getGlowSpin(bubble);
      if (spinAnim) {
        spinAnim.playbackRate = GLOW_LOADING_RATE;
        spinAnim.currentTime = GLOW_LOADING_PHASE * GLOW_REST_MS;
      }
    }

    // Trigger fade-in
    requestAnimationFrame(() => bubble.classList.add("show"));

    return bubble;
  }

  // Render the "Raffy Orbe" avatar/name header followed by the message text
  function setAIMessageContent(textElem, message) {
    textElem.innerHTML = "";

    const header = document.createElement("div");
    header.className = "chat-header";

    const avatar = document.createElement("img");
    avatar.src = "images/memojibadge.png";
    avatar.alt = "";
    avatar.className = "chat-avatar";

    const name = document.createElement("span");
    name.className = "chat-name";
    name.textContent = "Raffy Orbe";

    header.appendChild(avatar);
    header.appendChild(name);

    textElem.appendChild(header);
    textElem.appendChild(document.createTextNode(message));
  }

  // Swap the loading dots for the reply: the dots are replaced by the text, which fades up.
  // The glow keeps going, with its ring fading in and its speed easing down (settleGlow).
  function revealReply(bubble, message) {
    const textElem = bubble.querySelector(".chat-text");

    // While loading, the glow breathes (its clip's opacity is animated). Note where it is now,
    // so the opening swell below starts from there instead of snapping when that ends.
    const glowClip = bubble.querySelector(".chat-glow-clip");
    const breathingOpacity = glowClip ? getComputedStyle(glowClip).opacity : null;

    if (textElem) {
      setAIMessageContent(textElem, message);

      // Add fade animation for new message
      textElem.classList.add("fade-in");
      setTimeout(() => textElem.classList.remove("fade-in"), 400);
    }

    bubble.classList.remove("loading");

    // Opening swell: from where the breathing was, up to a bit brighter than steady, then back
    // down to steady, alongside the ring fading in and the speed easing down. When it ends the
    // clip is back on its CSS opacity, which equals the last keyframe, so there's no jump.
    if (glowClip && glowClip.animate) {
      const steady = getComputedStyle(glowClip).opacity; // the CSS value, now the breathing is gone
      glowClip.animate(
        [
          { opacity: breathingOpacity, easing: "ease-out" },
          { opacity: GLOW_REPLY_PEAK, offset: 0.18, easing: "ease-in-out" },
          { opacity: steady },
        ],
        { duration: GLOW_REPLY_FLASH_MS }
      );

      // Spread: the same shape and timing on the blur radius, so the halo widens as it brightens.
      // Loading never changes the blur, so this always starts from the same steady value.
      const glowWrapper = bubble.querySelector(".chat-glow");
      if (glowWrapper) {
        const steadyBlur = getComputedStyle(glowWrapper).filter; // e.g. "blur(7px)"
        glowWrapper.animate(
          [
            { filter: steadyBlur, easing: "ease-out" },
            { filter: `blur(${GLOW_REPLY_BLUR_PEAK_PX}px)`, offset: 0.18, easing: "ease-in-out" },
            { filter: steadyBlur },
          ],
          { duration: GLOW_REPLY_FLASH_MS }
        );
      }
    }

    settleGlow(bubble);
  }

  // Remove loading bubble
  function removeLoadingBubble() {
    const loading = overlayContainer.querySelector(".chat-overlay.loading");
    if (loading) {
      loading.remove();
      setHeroChatActive(false);
    }
  }

  // The chat request currently in flight, if any ({ controller, bubble }). While it exists the
  // send button acts as a stop button.
  let pendingRequest = null;

  function setSendButtonMode(isStop) {
    sendBtn.classList.toggle("is-stop", isStop);
    sendBtn.setAttribute("aria-label", isStop ? "Stop" : "Send");
  }

  // Stop button: cancel the API request and fade the loading bubble out like a close. Nothing
  // is shown in reply (sendMessage's catch sees the abort and stays quiet).
  function stopRequest() {
    if (!pendingRequest) return;
    const { controller, bubble } = pendingRequest;
    controller.abort();
    hideBubble(bubble);
  }

  // Send message
  async function sendMessage() {
    if (pendingRequest) return;

    const message = userInput.value.trim();
    if (!message) return;

    // The input locks while the reply loads; the send button stays live as the stop button
    userInput.disabled = true;

    // Unlock audio playback now, while still inside the user gesture
    unlockReplySound();

    // Show loading bubble
    const bubble = addAIBubble("", true);
    const controller = new AbortController();
    pendingRequest = { controller, bubble };
    setSendButtonMode(true);

    let stopped = false;

    try {
      const response = await fetch("https://raffyorbe-github-io.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, something went wrong. 😅";

      revealReply(bubble, aiMessage);
      playReplySound();
    }

    catch (error) {
      if (error.name === "AbortError") {
        // Stopped by the user: no reply, no error message, no sound
        stopped = true;
      } else {
        revealReply(bubble, "Error connecting to the server. 😵");
        playReplySound();

        console.error(error);
      }
    }

    finally {
      pendingRequest = null;
      setSendButtonMode(false);
      userInput.disabled = false;
      // A stopped message stays in the input so it can be edited and sent again
      if (!stopped) userInput.value = "";
      userInput.focus();
    }

  }

  // Placeholder change
  const input = document.getElementById("user-input");
  const placeholderEl = document.getElementById("placeholder");

  const placeholders = [
    "Ask me anything",
    "Ask me how I design experiences",
    "Ask me how I integrate systems",
    "Ask me how I develop frontends",
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
  sendBtn.addEventListener("click", () => (pendingRequest ? stopRequest() : sendMessage()));
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Egg
  // const egg = document.getElementById("egg");
  // const eggmsg = egg.querySelector(".eggmsg");
  // const eggIcon = document.getElementById("eggIcon");

  // egg.addEventListener("click", () => {
  //   eggIcon.textContent = "🦖";
  //   eggmsg.classList.add("show");

  //   setTimeout(() => {
  //     eggmsg.classList.remove("show");
  //     eggIcon.textContent = "🥚";
  //   }, 3000);
  // });

});
