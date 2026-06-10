const path = require('path');
const fs = require('fs');
const rcedit = require('rcedit');
const APP_VERSION = require('../utils/appVersion');

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
        fileVersion: APP_VERSION,
        productVersion: APP_VERSION,
        originalFilename: 'mcf-bet-bot.exe',
        internalName: 'mcf-bet-bot',
    },
};

async function applyWindowsMetadata(executablePath, iconPath) {
    const metadata = BUILD_CONFIG.windowsMetadata;
    await rcedit.rcedit(executablePath, {
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
            bytecode: true,
            minify: true,
            compile: {
                target: 'bun-windows-x64',
                outfile: 'mcf-bet-bot.exe',
                // windows: {
                //     title: "廢土對賭機器人",
                //     publisher: "jimmy20180130",
                //     version: APP_VERSION,
                //     description: "廢土對賭機器人 by Jimmy",
                //     copyright: "© 2026 Jimmy",
                //     hideConsole: false,
                //     icon: iconPath
                // },
            },
        });

        console.log(`Executable created at ${outputFileAbs}`);
        console.log(`Build version: ${APP_VERSION} (${APP_VERSION})`);

        // 把其他設定檔複製到 dist 裡面
        const itemsToCopy = ['data', 'locales', 'docs', 'README.md', 'config.toml', 'start.bat'];
        for (const item of itemsToCopy) {
            const srcPath = path.resolve(item);
            const destPath = path.resolve(outputDir, item);
            if (fs.existsSync(srcPath)) {
                if (fs.statSync(srcPath).isDirectory()) {
                    fs.cpSync(srcPath, destPath, { recursive: true });
                    console.log(`Copied directory ${item} to ${destPath}`);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`Copied file ${item} to ${destPath}`);
                }
            } else {
                console.warn(`Warning: ${item} not found.`);
            }
        }

        // 最後才應用 Windows metadata，確保 rcedit 修改的是最終的可執行檔
        await applyWindowsMetadata(outputFileAbs, iconPathAbs);
        console.log('Windows metadata applied successfully via rcedit.');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bundleExecutable();