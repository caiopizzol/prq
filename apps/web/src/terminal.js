const container = document.getElementById("scrollContainer");
const allLines = document.querySelectorAll(".line[data-step]");
const totalSteps = allLines.length;
const typedEl = document.getElementById("typed");
const cursorEl = document.getElementById("cursor");
const command = "prq";

let typingDone = false;

function updateTerminal() {
	const rect = container.getBoundingClientRect();
	const containerTop = -rect.top;
	const scrollableHeight = container.offsetHeight - window.innerHeight;

	if (scrollableHeight <= 0) return;

	const progress = Math.max(0, Math.min(1, containerTop / scrollableHeight));

	// First 10%: type the command
	const typingProgress = Math.min(1, progress / 0.1);
	const charsToShow = Math.floor(typingProgress * command.length);

	if (charsToShow > 0 && !typingDone) {
		typedEl.textContent = command.slice(0, charsToShow);
		allLines[0].classList.add("visible");

		if (charsToShow >= command.length) {
			typingDone = true;
			cursorEl.style.display = "none";
		}
	}

	// Scroll back up: reset
	if (progress < 0.02) {
		typingDone = false;
		typedEl.textContent = "";
		cursorEl.style.display = "inline-block";
		for (const line of allLines) line.classList.remove("visible");
		return;
	}

	if (!typingDone) return;

	// Remaining 90%: reveal output lines
	const outputProgress = Math.max(0, (progress - 0.1) / 0.9);
	const currentStep = Math.floor(outputProgress * (totalSteps - 1));

	for (let i = 1; i <= currentStep && i < totalSteps; i++) {
		allLines[i].classList.add("visible");
	}

	for (let i = currentStep + 1; i < totalSteps; i++) {
		allLines[i].classList.remove("visible");
	}
}

let ticking = false;
window.addEventListener("scroll", () => {
	if (!ticking) {
		requestAnimationFrame(() => {
			updateTerminal();
			ticking = false;
		});
		ticking = true;
	}
});

updateTerminal();

window.copyInstall = (el, text) => {
	navigator.clipboard.writeText(text);
	const btn = el.querySelector(".copy-btn");
	btn.textContent = "copied";
	btn.classList.add("copied");
	setTimeout(() => {
		btn.textContent = "copy";
		btn.classList.remove("copied");
	}, 2000);
};
