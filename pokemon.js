class GbaStateParser {
    constructor(file) {
        this.file = file;
        this.headerSize = 256;
    }

    analyze(onReady) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const buffer = e.target.result;
            const data = new Uint8Array(buffer).slice(0, this.headerSize);
            
            // Extract Title from 0xA0 to 0xAC
            let title = '';
            for (let i = 0xA0; i < 0xAC; i++) {
                if(data[i] !== 0) title += String.fromCharCode(data[i]);
            }
            title = title.trim();

            // Extract Game Code from 0xAC to 0xB0
            let gameCode = '';
            for (let i = 0xAC; i < 0xB0; i++) {
                if(data[i] !== 0) gameCode += String.fromCharCode(data[i]);
            }
            gameCode = gameCode.trim();

            // Hex Dump
            let hexDump = '';
            for (let i = 0; i < data.length; i += 16) {
                let chunk = data.slice(i, i + 16);
                let hexStr = Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                let asciiStr = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
                
                let offsetStr = i.toString(16).padStart(8, '0').toUpperCase();
                hexStr = hexStr.padEnd(16 * 3, ' ');
                
                hexDump += `${offsetStr}: ${hexStr} |${asciiStr}|\n`;
            }

            onReady({
                filename: this.file.name,
                title: title !== '' ? title : '(抽出エラー/不明)',
                gameCode: gameCode !== '' ? gameCode : '(不明)',
                hexDump: hexDump
            });
        };

        reader.readAsArrayBuffer(this.file);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadSection = document.getElementById('upload-section');
    const outputSection = document.getElementById('output-section');
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const parser = new GbaStateParser(file);
            
            parser.analyze((result) => {
                uploadSection.classList.add('hidden');
                outputSection.classList.remove('hidden');
                
                document.getElementById('file-name-display').textContent = `--- File Analysis: ${result.filename} ---`;
                document.getElementById('title-display').textContent = `推定ゲームタイトル: ${result.title}`;
                document.getElementById('code-display').textContent = `ゲームコード: ${result.gameCode}`;
                document.getElementById('hex-dump').textContent = result.hexDump;
            });
        }
    });

    // Make the A and B buttons reset the tool
    const resetTool = () => {
        fileInput.value = '';
        outputSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    };

    document.querySelector('.btn-b').addEventListener('click', resetTool);
    document.querySelector('.btn-a').addEventListener('click', () => {
        if (!outputSection.classList.contains('hidden')) {
            resetTool();
        } else {
            fileInput.click();
        }
    });
});
