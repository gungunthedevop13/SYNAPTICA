const showBadgePopup = (badge) => {
  const popup = document.createElement("div");
  popup.className = "badge-popup";
  popup.innerText = `🏅 Badge Unlocked: ${badge}`;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("show");
  }, 100); // Delay for transition

  setTimeout(() => {
    popup.classList.remove("show");
    setTimeout(() => document.body.removeChild(popup), 300);
  }, 3000);
};
