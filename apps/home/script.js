const copyButton = document.getElementById('copyCommand');
const commandPreview = document.getElementById('commandPreview');

async function copyCommand() {
    const command = commandPreview.textContent;

    try {
        await navigator.clipboard.writeText(command);
        copyButton.textContent = 'Copied';
        window.setTimeout(() => {
            copyButton.textContent = 'Copy run command';
        }, 1500);
    } catch (error) {
        copyButton.textContent = 'Copy failed';
        window.setTimeout(() => {
            copyButton.textContent = 'Copy run command';
        }, 1500);
    }
}

copyButton.addEventListener('click', copyCommand);
