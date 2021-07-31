const sharp = require("sharp");
const ziplib = require("adm-zip");
const fs = require("fs");
const LEFT = 1,
  RIGHT = 2,
  N_DIGITS = 3,
  SOURCE_PATH = "sources\\",
  EXTRACT_PATH = ".tmp\\extracted\\",
  CUT_PATH = ".tmp\\cut\\",
  OUTPUT_PATH = "output\\";
const HAS_COVER_PARAM = "--hasSinglePageCover";
const SHARP_CONFIG = {
  1: {
    width: 1475,
    height: 2150,
    left: 0,
    top: 0,
  },
  2: {
    width: 1475,
    height: 2150,
    left: 1475,
    top: 0,
  },
};
numberToFilename = (number, nDigit) => {
  let numberString = number + "";
  while (numberString.length < nDigit) {
    numberString = "0" + numberString;
  }
  return numberString;
};
cutPage = async (inputFileName, outputFileNumber) => {
  //const originalImage = numberToFilename(fileName, N_DIGITS) + FILE_EXT;
  //const outputImage =
  //"outputs\\" +
  //(side === RIGHT
  // ? numberToFilename(fileName, N_DIGITS)
  //: numberToFilename(fileName + 1, N_DIGITS)) +
  //FILE_EXT;
  // Get img width
  let { width, height } = await sharp(EXTRACT_PATH + inputFileName).metadata();
  width = width - (width - (width % 2)) / 2;
  const OPTIONS_FOR_RIGHT = {
      width,
      height,
      left: width - 1,
      top: 0,
    },
    OPTIONS_FOR_LEFT = {
      ...OPTIONS_FOR_RIGHT,
      left: 0,
    };
  const FILE_EXT = inputFileName.split(".")[1];

  if (!fs.existsSync(CUT_PATH)) {
    fs.mkdirSync(CUT_PATH);
  }
  await sharp(EXTRACT_PATH + inputFileName)
    .extract(OPTIONS_FOR_RIGHT)
    .toFile(CUT_PATH + outputFileNumber + "." + FILE_EXT);
  outputFileNumber++;
  await sharp(EXTRACT_PATH + inputFileName)
    .extract(OPTIONS_FOR_LEFT)
    .toFile(CUT_PATH + outputFileNumber + "." + FILE_EXT);
};
function deleteTmpDir() {
  if (fs.existsSync(EXTRACT_PATH)) {
    fs.rmdirSync(EXTRACT_PATH, { recursive: true });
  }
  if (fs.existsSync(CUT_PATH)) {
    fs.rmdirSync(CUT_PATH, { recursive: true });
  }
}
async function extractCbz(inputFileName) {
  let zipFile = new ziplib(SOURCE_PATH + inputFileName);
  if (!fs.existsSync(EXTRACT_PATH)) {
    fs.mkdirSync(EXTRACT_PATH, { recursive: true });
  }
  await zipFile.extractAllTo(EXTRACT_PATH, true);
}
async function compressCbz(cbzName) {
  let zipFile = new ziplib();
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }
  zipFile.addLocalFolder(CUT_PATH);

  await zipFile.writeZip(OUTPUT_PATH + cbzName);
}
function getFileNamesOrdered() {
  return fs.readdirSync(EXTRACT_PATH);
}
function saveCover(coverFileName) {
  if (!fs.existsSync(CUT_PATH)) {
    fs.mkdirSync(CUT_PATH);
  }
  const outputCoverName = "0." + coverFileName.split(".")[1];
  fs.copyFileSync(EXTRACT_PATH + coverFileName, CUT_PATH + outputCoverName);
}
async function reorderImages(namesArray, firstPageIsCover) {
  let lastCutPage = 0;
  if (firstPageIsCover) {
    saveCover(namesArray[0]);
    namesArray.shift();
    lastCutPage++;
  }
  for (let i in namesArray) {
    await cutPage(namesArray[i], lastCutPage);
    lastCutPage += 2;
  }
}
async function start() {
  try {
    const ARGS = process.argv.slice(2);
    if (ARGS.length > 0) {
      if (
        ARGS.length === 1 ||
        (ARGS.length === 2 && ARGS[1] === HAS_COVER_PARAM)
      ) {
        let filesArray;
        console.log("[*] Extracting images from comic file...");
        await extractCbz(ARGS[0]);
        filesArray = getFileNamesOrdered();
        console.log("[*] Reordering pages...");
        await reorderImages(filesArray, ARGS.length > 1);
        console.log("[*] Compressing new comic file...");
        await compressCbz(ARGS[0]);
        console.log("[*] Done!");
      } else throw new Error("No file name was provided");
    } else throw new Error("No file name was provided");
  } catch (err) {
    console.log(err);
  }
  deleteTmpDir();
}
start();

// Extract files to .tmp/extracted
// Get files names array in order
// For every file make cuts and save on .tmp/cut
// Compress all files and save on outputs
