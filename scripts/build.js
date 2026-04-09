const path = require('path');
const fs = require('fs');
const rcedit = require('rcedit');

const BUILD_CONFIG = {
    entryPoint: ['./index.js'],
    outputDir: 'dist',
    outputFile: path.join('dist', 'mcf-bet-bot.exe'),
    iconPath: path.join('scripts', 'app.ico'),
    windowsMetadata: {
        companyName: 'Jimmy',
        fileDescription: '廢土對賭機器人 by Jimmy',
        productName: 'mcBet-Bot',
        legalCopyright: '© 2026 Jimmy',
        fileVersion: '1.0.0.0',
        productVersion: '1.0.0.0',
        originalFilename: 'mcf-bet-bot.exe',
        internalName: 'mcf-bet-bot',
    },
};

async function applyWindowsMetadata(executablePath, iconPath) {
    const metadata = BUILD_CONFIG.windowsMetadata;
    await rcedit(executablePath, {
        icon: iconPath,
        'file-version': metadata.fileVersion,
        'product-version': metadata.productVersion,
        'version-string': {
            CompanyName: metadata.companyName,
            FileDescription: metadata.fileDescription,
            ProductName: metadata.productName,
            LegalCopyright: metadata.legalCopyright,
            OriginalFilename: metadata.originalFilename,
            InternalName: metadata.internalName,
        },
    });
}

async function bundleExecutable() {
    const entryPoint = BUILD_CONFIG.entryPoint;
    const outputDir = BUILD_CONFIG.outputDir;
    const outputFile = BUILD_CONFIG.outputFile;
    const iconPath = BUILD_CONFIG.iconPath;
    const outputFileAbs = path.resolve(outputFile);
    const iconPathAbs = path.resolve(iconPath);

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    if (!fs.existsSync(iconPathAbs)) {
        console.error(`Icon file not found at: ${iconPathAbs}`);
        process.exit(1);
    }

    try {
        console.log('Bundling with Bun.build()...');
        await Bun.build({
            entrypoints: entryPoint,
            outdir: outputDir,
            compile: {
                target: 'bun-windows-x64',
                outfile: 'mcf-bet-bot.exe',
                windows: {
                    title: "廢土對賭機器人",
                    publisher: "jimmy20180130",
                    version: "1.0.0.0",
                    description: "廢土對賭機器人 by Jimmy",
                    copyright: "© 2026 Jimmy",
                    hideConsole: false,
                    icon: iconPath
                },
            },
        });

        console.log(`Executable created at ${outputFileAbs}`);

        //await applyWindowsMetadata(outputFileAbs, iconPathAbs);
        console.log('Windows metadata applied successfully via rcedit.');

        const configPath = path.resolve('config.toml');
        const destConfigPath = path.resolve(outputDir, 'config.toml');
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, destConfigPath);
            console.log(`Copied config.toml to ${destConfigPath}`);
        } else {
            console.warn('Warning: config.toml not found.');
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bundleExecutable();