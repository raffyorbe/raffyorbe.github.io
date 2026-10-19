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

  const glow = document.querySelector('.hello-chat-border-wrapper .chat-bar-glow');

  // Intro glow: the chat bubble's reply reveal (see revealReply and settleGlow below), played
  // once behind the input, with the bubble's colors in every browser. Like a reply, it fades in
  // rotating (the spin starts fast and the ring's gap fills in) and swells to full strength and
  // its widest spread 18% into the bubble's 1.4s reveal, while the spin slows to rest. Unlike
  // the bubble, which settles and keeps glowing, it fades out slowly from the peak to nothing;
  // the glow is switched off after.
  const CHAT_BAR_GLOW_FADE_MS = 1600; // slow fade out after the peak

  // Its crisp 1px edge line (.chat-bar-core) is an unblurred copy that runs the same spin
  // and fade, started in the same frame so the two stay in step.
  const glowCore = document.querySelector('.hello-chat-border-wrapper .chat-bar-core');

  function playChatBarGlow() {
    const clip = glow.querySelector('.chat-glow-clip');
    const layers = glowCore ? [glow, glowCore] : [glow];
    // Each spin is started here, from script, in the same moment for both layers: the bubble's
    // 6s-per-lap rotation at its fast loading speed, which settleGlow eases to rest below.
    layers.forEach((layer) => {
      const spin = layer.querySelector('.chat-glow-spin').animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: GLOW_REST_MS, iterations: Infinity }
      );
      spin.playbackRate = GLOW_LOADING_RATE;
      layer.classList.add('visible');
    });

    // Computed here, not at the top level: the bubble's constants are declared further down
    const peakMs = 0.18 * GLOW_REPLY_FLASH_MS; // the bubble's peak, ~250ms in
    const total = peakMs + CHAT_BAR_GLOW_FADE_MS;
    const fade = [
      { opacity: 0, easing: 'ease-out' },
      { opacity: GLOW_REPLY_PEAK, offset: peakMs / total, easing: 'ease-in-out' },
      { opacity: 0 },
    ];
    clip.animate(fade, { duration: total, fill: 'forwards' });
    if (glowCore) glowCore.animate(fade, { duration: total, fill: 'forwards' });

    // The bubble's spread: 7px widening to 12px at the peak, back to 7px by the end of the reveal
    const steadyBlur = getComputedStyle(glow).filter;
    glow.animate(
      [
        { filter: steadyBlur, easing: 'ease-out' },
        { filter: `blur(${GLOW_REPLY_BLUR_PEAK_PX}px)`, offset: 0.18, easing: 'ease-in-out' },
        { filter: steadyBlur },
      ],
      { duration: GLOW_REPLY_FLASH_MS }
    );

    layers.forEach((layer) => settleGlow(layer)); // the bubble's spin slowdown to rest

    setTimeout(() => {
      layers.forEach((layer) => layer.classList.add('done'));
      chatBarGlowDone = true;
      document.dispatchEvent(new Event('chatbarglowdone')); // starts the hero's mobile drift
    }, total + 100);
  }

  // Starts the intro 500ms after the page is actually on screen. The page can load, and even
  // render, while hidden: Safari preloads a site you've visited as a "Top Hit" while you're
  // still typing in the address bar (and Chrome can prerender it), and swaps it in only when
  // you press Return. Started from load alone, the short intro could be half over, or done,
  // by the time you saw it. So while the page is hidden (or prerendering) this waits for it to
  // become visible, and it checks again when the 500ms pause ends.
  let chatBarGlowStarted = false;
  let chatBarGlowDone = !glow; // no intro glow on the page: nothing to wait for

  function pageIsShown() {
    return document.visibilityState === 'visible' && !document.prerendering;
  }

  function startChatBarGlowWhenShown() {
    if (chatBarGlowStarted) return;
    if (!pageIsShown()) {
      const onShown = () => {
        if (!pageIsShown()) return;
        document.removeEventListener('visibilitychange', onShown);
        document.removeEventListener('prerenderingchange', onShown);
        startChatBarGlowWhenShown();
      };
      document.addEventListener('visibilitychange', onShown);
      document.addEventListener('prerenderingchange', onShown);
      return;
    }
    setTimeout(() => {
      if (chatBarGlowStarted) return;
      if (!pageIsShown()) return startChatBarGlowWhenShown(); // hidden again during the pause
      chatBarGlowStarted = true;
      playChatBarGlow();
    }, 500); // a short pause after the page appears
  }

  if (glow) {
    const target = document.querySelector('.hello-chat-border-wrapper');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            
            startChatBarGlowWhenShown(); // the intro glow, once the page is on screen

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

  // Notification sound played when a text reply (not the loading dots) appears.
  // Played through Web Audio rather than an <audio> element: the file is decoded into memory
  // up front, so it starts right away at the exact offset. An <audio> element has to wake up
  // and seek after the wait for a reply, which made the sound land late in Safari and choke
  // on phones.
  const REPLY_SOUND_URL = "audio/ai-raffy-notification.mp3";

  // The file opens with 0.3s of silence before a sharp hit (at 0.30s). Skip it so the hit comes
  // right as the sound starts (0 and 0.1s also tried).
  const REPLY_SOUND_START_S = 0.29;

  // The ding lands once the reply bubble has fully floated up: .chat-overlay.reply-in's
  // fadeUpNew is 0.35s in styles/index.css. Scheduled on the audio clock, so it's exact.
  const REPLY_SOUND_DELAY_S = 0.35;

  // How long a reply waits for a paused audio context to wake before skipping its sound
  const REPLY_SOUND_WAKE_LIMIT_MS = 300;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let replySoundBuffer = null;
  let replySoundSource = null;

  if (audioCtx) {
    fetch(REPLY_SOUND_URL)
      .then((res) => res.arrayBuffer())
      // Callback form of decodeAudioData for older Safari, which has no promise version
      .then((data) => new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject)))
      .then((buffer) => { replySoundBuffer = buffer; })
      .catch(() => {});
  }

  // delayS: how long from now until the hit should land
  function startReplySound(delayS) {
    // Restart rather than overlap if a previous reply's sound is still playing
    if (replySoundSource) replySoundSource.stop();
    replySoundSource = audioCtx.createBufferSource();
    replySoundSource.buffer = replySoundBuffer;
    replySoundSource.connect(audioCtx.destination);
    replySoundSource.start(audioCtx.currentTime + Math.max(0, delayS), REPLY_SOUND_START_S);
  }

  function playReplySound() {
    if (!audioCtx || !replySoundBuffer) return;
    if (audioCtx.state === "running") {
      startReplySound(REPLY_SOUND_DELAY_S);
      return;
    }

    // Never start a sound on a paused context: Safari holds it until the context next resumes
    // (the next send), so it played late, back to back with the next reply's sound. Try to wake
    // the context instead, and skip the sound if that doesn't happen quickly. Outside a user
    // gesture, resume() can stay pending until the next one, so the time check matters.
    const requestedAt = performance.now();
    audioCtx.resume()
      .then(() => {
        const wokeAfterMs = performance.now() - requestedAt;
        if (audioCtx.state === "running" && wokeAfterMs <= REPLY_SOUND_WAKE_LIMIT_MS) {
          // Count the wake time against the delay, so the hit still lands at the end of the float-up
          startReplySound(REPLY_SOUND_DELAY_S - wokeAfterMs / 1000);
        }
      })
      .catch(() => {});
  }

  // Browsers keep an AudioContext suspended until a user gesture resumes it. Resume it here,
  // inside the send click/keydown, so the reply sound can play whenever the response arrives.
  // Doing it on every send also recovers a context Safari suspended or interrupted in between.
  // The silent one-sample buffer is for older iOS Safari, which also wants a sound started
  // during the gesture before it will play any later.
  function unlockReplySound() {
    if (!audioCtx) return;
    if (audioCtx.state !== "running") audioCtx.resume().catch(() => {});
    const silent = audioCtx.createBufferSource();
    silent.buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    silent.connect(audioCtx.destination);
    silent.start(0);
  }

  // Hero overlay switches to a frosted dark layer while a chat bubble is showing
  const heroOverlay = inputWrapper.closest('.hello-overlay');

  function setHeroChatActive(active) {
    if (heroOverlay) heroOverlay.classList.toggle('chat-active', active);
    // Pauses the hero's light trail while the chat has the focus (see the trail code below)
    document.dispatchEvent(new CustomEvent('herochatchange', { detail: { active } }));
  }

  // Fade a bubble down and out and drop the frosted layer behind it. Shared by the close
  // button (on a reply) and the stop button (while loading), so both leave the same way.
  function hideBubble(bubble) {
    setHeroChatActive(false);
    bubble.classList.remove("reply-in"); // let a still-running reply fade-up yield to the fade-down
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

  // Waits for the spin to actually be running first (its ready promise). This changes the speed
  // every frame, and in Chromium each change made while a just-started animation is still
  // pending restarts its wait, so a spin started right before this (the chat bar intro, the
  // skills panel opening) could stay frozen at 0 through the whole slowdown.
  function settleGlow(bubble) {
    const anim = getGlowSpin(bubble);
    if (!anim) return;
    anim.ready.then(() => {
      const from = anim.playbackRate;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / GLOW_SETTLE_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        anim.playbackRate = from + (1 - from) * eased;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Opening swell of a glow (a reply landing, or the skills modal opening): from fromOpacity up
  // to GLOW_REPLY_PEAK, then back down to steady, with the blur spreading and narrowing in step.
  // When it ends the clip is back on its CSS opacity, which equals the last keyframe, so there's
  // no jump.
  function swellGlow(container, fromOpacity) {
    const glowClip = container.querySelector(".chat-glow-clip");
    if (!glowClip || !glowClip.animate) return;
    const steady = getComputedStyle(glowClip).opacity; // the CSS value (any breathing must be gone)
    glowClip.animate(
      [
        { opacity: fromOpacity, easing: "ease-out" },
        { opacity: GLOW_REPLY_PEAK, offset: 0.18, easing: "ease-in-out" },
        { opacity: steady },
      ],
      { duration: GLOW_REPLY_FLASH_MS }
    );

    // Spread: the same shape and timing on the blur radius, so the halo widens as it brightens.
    // Loading never changes the blur, so this always starts from the same steady value.
    const glowWrapper = container.querySelector(".chat-glow");
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

    // Close button. The label gives screen readers "Close" instead of "times" for the ×.
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chat-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    bubble.appendChild(closeBtn);

    // Close fade-out. The button disappears with the bubble, so a keyboard user's focus goes
    // back to the chat input. Mouse and touch closes leave focus alone, so a tap doesn't pop
    // up the phone keyboard.
    closeBtn.addEventListener("click", () => {
      const fromKeyboard = closeBtn.matches(":focus-visible");
      hideBubble(bubble);
      if (fromKeyboard) userInput.focus();
    });

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

  // Swap the loading dots for the reply: the whole bubble, text included, fades up as one.
  // The glow keeps going, with its ring fading in and its speed easing down (settleGlow).
  function revealReply(bubble, message) {
    const textElem = bubble.querySelector(".chat-text");

    // While loading, the glow breathes (its clip's opacity is animated). Note where it is now,
    // so the opening swell below starts from there instead of snapping when that ends.
    const glowClip = bubble.querySelector(".chat-glow-clip");
    const breathingOpacity = glowClip ? getComputedStyle(glowClip).opacity : null;

    if (textElem) setAIMessageContent(textElem, message);

    // Whole-bubble fade-up (.chat-overlay.reply-in in styles/index.css). animationend also
    // bubbles up from the glow's own animations, so only react to the bubble's.
    bubble.classList.add("reply-in");
    bubble.addEventListener("animationend", function onEnd(e) {
      if (e.target !== bubble) return;
      bubble.removeEventListener("animationend", onEnd);
      bubble.classList.remove("reply-in");
    });

    bubble.classList.remove("loading");

    // Opening swell: from where the breathing was, up to a bit brighter than steady, then back
    // down to steady, alongside the ring fading in and the speed easing down.
    if (glowClip) swellGlow(bubble, breathingOpacity);

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

    // Bring the chat back front and center: on mobile the keyboard often scrolls the page down,
    // and disabling the input above dismisses it, so glide back to the top as the bubble appears
    window.scrollTo({ top: 0, behavior: "smooth" });

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
      // Focus stays in the input (moving it to the reply's × on arrival was tried and dropped
      // as distracting). Esc closes the reply, and Tab reaches its ×.
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
    "Ask me what managers say about me"
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

  // Talent model modal (#skills-dialog, opened by "View talent model"). It fades up like the chat
  // bubble, and its glow opens the way a landing reply's does: spinning at the loading pace and
  // easing down (settleGlow), the ring fading in, and the swell (swellGlow).
  //
  // Opened with show(), not showModal(): with a modal dialog open, iOS Safari paints its status
  // bar and bottom toolbar solid black instead of showing the (frosted) page under them, even
  // with no dim and the dialog clear of the screen edges (checked in the iOS 26.4 simulator).
  // So what showModal() did for free is done here: the rest of the page is made inert (no
  // clicks, and Tab stays in the modal), Esc closes it, focus moves into it and goes back to
  // the link afterwards, and it sits above the navbar (z-index in styles/index.css).
  // A fixed layer reaching the screen's edge does the same, so the dim and blur are a separate
  // in-page layer (#skills-scrim), placed over the visible area when the modal opens.
  const skillsDialog = document.getElementById("skills-dialog");
  const skillsScrim = document.getElementById("skills-scrim");
  const skillsPanel = skillsDialog.querySelector(".skills-modal");
  const skillsBody = skillsDialog.querySelector(".skills-body");
  let skillsClosing = false;
  let skillsReturnFocus = null;

  // Keeps the scrim over the visible area (200px margin above and below the view), in case the
  // page still moves while the modal is open (a scroll in progress, or a rubber-band bounce)
  function placeSkillsScrim() {
    skillsScrim.style.top = `${window.scrollY - 200}px`;
  }

  function setPageInert(inert) {
    for (const el of document.body.children) {
      if (el !== skillsDialog && el !== skillsScrim && el.tagName !== "SCRIPT") el.inert = inert;
    }
  }

  function openSkills() {
    if (skillsDialog.open) return;
    skillsReturnFocus = document.activeElement;
    skillsPanel.classList.add("glow-intro");
    placeSkillsScrim();
    window.addEventListener("scroll", placeSkillsScrim, { passive: true });
    skillsScrim.classList.add("open");
    skillsDialog.show();
    setPageInert(true);
    document.documentElement.classList.add("skills-open");
    // Focus the content (no ring) rather than the ×, which Tab reaches
    skillsBody.focus({ preventScroll: true });

    const spinAnim = getGlowSpin(skillsPanel);
    if (spinAnim) spinAnim.playbackRate = GLOW_LOADING_RATE;

    skillsPanel.getBoundingClientRect(); // lay out the hidden state first so the fade-up runs
    skillsDialog.classList.add("show");
    skillsScrim.classList.add("show");
    skillsPanel.classList.remove("glow-intro");
    swellGlow(skillsPanel, 0);
    settleGlow(skillsPanel);
  }

  function closeSkills() {
    if (!skillsDialog.open || skillsClosing) return;
    skillsClosing = true;
    skillsDialog.classList.remove("show");
    skillsScrim.classList.remove("show");

    // Close once the panel has faded down. transitionend also bubbles up from the glow's ring,
    // so only react to the panel's own; the timeout covers a transition that never runs.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      skillsPanel.removeEventListener("transitionend", onEnd);
      skillsDialog.close();
      skillsScrim.classList.remove("open");
      window.removeEventListener("scroll", placeSkillsScrim);
      setPageInert(false);
      document.documentElement.classList.remove("skills-open");
      skillsClosing = false;
      if (skillsReturnFocus && skillsReturnFocus.focus) skillsReturnFocus.focus({ preventScroll: true });
      skillsReturnFocus = null;
    };
    const onEnd = (e) => {
      if (e.target === skillsPanel && e.propertyName === "opacity") finish();
    };
    skillsPanel.addEventListener("transitionend", onEnd);
    setTimeout(finish, 500);
  }

  document.getElementById("skills-open").addEventListener("click", openSkills);
  skillsDialog.querySelector(".skills-close").addEventListener("click", closeSkills);

  // Esc closes it (a non-modal dialog gets no "cancel" event). Tab (and Safari's Option-Tab)
  // wraps around inside the modal instead of leaving the page: the page behind is inert, so
  // otherwise each press past the last control went out to the browser, which Safari shows as a
  // highlight around the whole page (and the first press from the content, which comes after
  // the × in the markup, did that before reaching the ×).
  document.addEventListener("keydown", (e) => {
    if (!skillsDialog.open) return;
    if (e.key === "Escape") {
      closeSkills();
      return;
    }
    if (e.key !== "Tab") return;
    const stops = [...skillsDialog.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled);
    if (!stops.length) return;
    e.preventDefault();
    const i = stops.indexOf(document.activeElement);
    const next = e.shiftKey
      ? stops[i <= 0 ? stops.length - 1 : i - 1]
      : stops[i === -1 || i === stops.length - 1 ? 0 : i + 1];
    next.focus();
  });

  // A click on the dimmed area around the panel (the dialog itself, or the scrim past its
  // edges) closes it too
  skillsDialog.addEventListener("click", (e) => {
    if (e.target === skillsDialog) closeSkills();
  });
  skillsScrim.addEventListener("click", closeSkills);






  // Event listeners
  sendBtn.addEventListener("click", () => (pendingRequest ? stopRequest() : sendMessage()));

  // Esc closes a reply bubble (like its × button) and puts focus back in the chat input.
  // While loading there's no ×; the send button's stop handles that.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (skillsDialog.open) return; // that Esc closes the skills modal instead
    const reply = overlayContainer.querySelector(".chat-overlay.show:not(.loading):not(.hide)");
    if (!reply) return;
    hideBubble(reply);
    userInput.focus();
  });

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

  // Hero light trail: a glowing streak that follows the cursor across the black hero, white at
  // the head and cooling through the chat glow's colors as it fades. Points are drawn as
  // pre-rendered soft dots with additive blending, and the loop stops once the trail has
  // faded, so an idle hero costs nothing.
  // Touch screens can't hover (a drag scrolls the page), so there the trail drifts on its own
  // (starting once the chat bar's intro glow has finished) along a wandering path, follows a
  // finger while one is down, and glides back into the drift when it lifts. The drift only
  // runs while the hero is on screen and the tab is visible. While a chat bubble is showing,
  // the trail is paused on every device.
  const glowCell = document.querySelector(".hello-cell");
  const glowCanvas = glowCell && glowCell.querySelector(".hello-glow");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (glowCanvas && !reduceMotion) {
    const ctx = glowCanvas.getContext("2d");
    const TRAIL_LIFE = 900;   // ms a trail point takes to fade out
    const SPACING = 6;        // px between interpolated points, so fast moves stay continuous
    const HEAD_RADIUS = 90;   // px, the streak's width at the cursor
    const HALO_RADIUS = 420;  // px, the wide dim light around the cursor
    // Head-to-tail colors: the chat glow's ring (.chat-glow-color), read backwards from its
    // white, so the trail cycles through every glow color with white leading
    const TRAIL_COLORS = ["#ffffff", "#ffd9a8", "#ff9d52", "#60bae4", "#409bd0", "#bfe3ff"];

    // One soft radial dot per color, drawn once and stamped with drawImage
    function makeDot(color) {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, color);
      grad.addColorStop(0.35, color + "66");
      grad.addColorStop(1, color + "00");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }
    const dots = TRAIL_COLORS.map(makeDot);
    const haloDot = makeDot("#bfe3ff");

    let points = [];          // { x, y, t } in CSS px relative to the canvas
    let head = null;          // last pointer position, for the halo
    let headAlpha = 0;        // halo fades in on enter, out on leave
    let pointerInside = false;
    let rafId = null;

    // Touch-only devices (phones, tablets without a mouse) get the ambient drift
    const touchOnly = window.matchMedia("(hover: none)").matches;
    // The drift moves fast and draws a slimmer streak with a smaller halo, so on a phone it
    // reads as sweeping lines of light rather than a floating circle
    const DRIFT_SPEED = 3;
    const headRadius = touchOnly ? 55 : HEAD_RADIUS;
    const haloRadius = touchOnly ? 260 : HALO_RADIUS;
    let heroVisible = false;
    // While a chat bubble is showing, the trail is paused (no cursor, finger or drift) and
    // whatever is lit fades out, so the focus stays on the chat. It picks up again once the
    // bubble closes.
    let chatActive = false;
    document.addEventListener("herochatchange", (e) => {
      chatActive = e.detail.active;
      if (chatActive) {
        pointerInside = false;
        fingerDown = false;
        release = null;
      }
      start(); // fades out what's lit, or restarts the drift
    });

    // The drift waits for the chat bar's intro glow to finish, so the two don't compete
    let introDone = chatBarGlowDone;
    document.addEventListener("chatbarglowdone", () => {
      introDone = true;
      start();
    });
    let fingerDown = false;
    let release = null;        // { x, y, t } where the finger lifted, to glide back into the drift
    const DRIFT_RETURN = 1200; // ms to glide from the lifted finger back onto the drift path
    let cssW = 0;
    let cssH = 0;
    // The canvas only holds soft gradients, so it renders at half the CSS size and the browser
    // scales it up. Looks the same, but uses a quarter of the memory of 1x (a sixteenth of a
    // 2x retina canvas), e.g. about 1.2MB instead of 20MB on a 1440×900 retina hero.
    const scale = 0.5;

    function resize() {
      const r = glowCanvas.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      glowCanvas.width = Math.round(r.width * scale);
      glowCanvas.height = Math.round(r.height * scale);
    }
    resize();
    window.addEventListener("resize", resize);

    function addPoint(clientX, clientY) {
      const r = glowCanvas.getBoundingClientRect();
      addPointAt(clientX - r.left, clientY - r.top, performance.now());
      pointerInside = true;
      start();
    }

    // x, y in CSS px relative to the canvas
    function addPointAt(x, y, now) {
      const last = points[points.length - 1];
      if (last && now - last.t < TRAIL_LIFE) {
        const dist = Math.hypot(x - last.x, y - last.y);
        const steps = Math.min(Math.floor(dist / SPACING), 60);
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          points.push({ x: last.x + (x - last.x) * f, y: last.y + (y - last.y) * f, t: last.t + (now - last.t) * f });
        }
      }
      points.push({ x, y, t: now });
      head = { x, y };
    }

    function isDrifting() {
      return touchOnly && introDone && heroVisible && !chatActive && !fingerDown && !document.hidden;
    }

    // A slow wandering path: two sine waves per axis at unrelated speeds, so it never visibly
    // repeats. Roughly 300–750px/s on a phone.
    function driftPosition(now) {
      const t = (now / 1000) * DRIFT_SPEED;
      const x = cssW * (0.5 + 0.36 * Math.sin(t * 0.53) + 0.08 * Math.sin(t * 1.37 + 2));
      const y = cssH * (0.45 + 0.26 * Math.sin(t * 0.71 + 1) + 0.06 * Math.sin(t * 1.73));
      if (!release) return { x, y };
      // Just after a finger lifts: glide from where it lifted onto the path (smoothstep)
      const k = Math.min(1, (now - release.t) / DRIFT_RETURN);
      const e = k * k * (3 - 2 * k);
      const pos = { x: release.x + (x - release.x) * e, y: release.y + (y - release.y) * e };
      if (k === 1) release = null;
      return pos;
    }

    function start() {
      if (rafId === null) rafId = requestAnimationFrame(draw);
    }

    function draw(now) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = "lighter";

      const drifting = isDrifting();
      if (drifting) {
        const d = driftPosition(now);
        addPointAt(d.x, d.y, now);
      } else if (fingerDown && head) {
        // Keep a finger that's held still glowing (touch events only fire on movement)
        addPointAt(head.x, head.y, now);
      }

      // Wide dim halo lighting the area around the cursor
      const haloTarget = pointerInside || drifting ? 1 : 0;
      headAlpha += (haloTarget - headAlpha) * 0.08;
      if (Math.abs(haloTarget - headAlpha) < 0.01) headAlpha = haloTarget;
      if (head && headAlpha > 0.01) {
        ctx.globalAlpha = 0.22 * headAlpha;
        ctx.drawImage(haloDot, head.x - haloRadius, head.y - haloRadius, haloRadius * 2, haloRadius * 2);
      }

      // The streak, oldest first so the bright head lands on top
      points = points.filter(p => now - p.t < TRAIL_LIFE);
      for (const p of points) {
        // 0 at the head, 1 at the tail. The frame's timestamp can be slightly older than the
        // newest event's, so clamp at 0.
        const age = Math.max(0, (now - p.t) / TRAIL_LIFE);
        const fade = Math.pow(1 - age, 1.4);
        const radius = headRadius * (1 - age * 0.4);
        // Cross-fade between the two nearest colors so the streak shifts smoothly
        const pos = age * (dots.length - 1);
        const i = Math.min(Math.floor(pos), dots.length - 2);
        const mix = pos - i;
        ctx.globalAlpha = 0.12 * fade * (1 - mix);
        ctx.drawImage(dots[i], p.x - radius, p.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 0.12 * fade * mix;
        ctx.drawImage(dots[i + 1], p.x - radius, p.y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;

      // Keep going while the trail is fading or the halo is still easing in or out. Once both
      // settle the canvas keeps its last frame, so a resting cursor costs nothing.
      if (points.length || headAlpha !== haloTarget || drifting || fingerDown) {
        rafId = requestAnimationFrame(draw);
      } else {
        rafId = null;
      }
    }

    // Listen on the whole document and test against the hero's box, rather than listening on
    // the hero itself, so the floating navbar (which sits over the hero but lives outside it)
    // counts as hero area too and the trail keeps going under it.
    function inHero(clientX, clientY) {
      const r = glowCell.getBoundingClientRect();
      return clientX >= r.left && clientX < r.right && clientY >= r.top && clientY < r.bottom;
    }
    function leaveHero() {
      if (!pointerInside) return;
      pointerInside = false;
      start();
    }

    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (chatActive) return;
      if (inHero(e.clientX, e.clientY)) addPoint(e.clientX, e.clientY);
      else leaveHero();
    });
    // Cursor left the browser window
    document.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget && (e.pointerType === "mouse" || e.pointerType === "pen")) leaveHero();
    });
    // Touch uses touch events, which keep firing while the finger scrolls the page
    // (pointer events get cancelled as soon as a scroll starts)
    function onTouch(e) {
      if (chatActive) return;
      const t = e.touches[0];
      if (!inHero(t.clientX, t.clientY)) {
        if (fingerDown) onTouchEnd(e, true);
        return;
      }
      fingerDown = true;
      release = null;
      addPoint(t.clientX, t.clientY);
    }
    function onTouchEnd(e, leftHero) {
      if (!fingerDown) return;
      if (!leftHero && e.touches.length) return; // another finger is still down
      fingerDown = false;
      pointerInside = false;
      if (head) release = { x: head.x, y: head.y, t: performance.now() };
      start();
    }
    if (touchOnly) {
      document.addEventListener("touchstart", onTouch, { passive: true });
      document.addEventListener("touchmove", onTouch, { passive: true });
      document.addEventListener("touchend", (e) => onTouchEnd(e), { passive: true });
      document.addEventListener("touchcancel", (e) => onTouchEnd(e), { passive: true });
    }

    // Run the drift only while the hero is on screen and the tab is visible. The draw loop
    // stops by itself once isDrifting() turns false and the trail fades.
    if (touchOnly) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) start();
      }).observe(glowCell);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) start();
      });
    }
  }


});
