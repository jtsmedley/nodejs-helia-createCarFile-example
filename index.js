// Helia Imports
import { createHelia } from "helia";
import { car } from "@helia/car";
import { unixfs } from "@helia/unixfs";
// IPFS Imports
import { FsBlockstore } from "blockstore-fs";
// IPLD Imports
import { CarWriter } from "@ipld/car";
// Utility Imports
import path from "node:path";
import os from "node:os";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";

(async () => {
  // Setup Upload Options
  const uploadId = "sampleDirectoryUpload",
    temporaryBlockstorePath = path.resolve(
      os.tmpdir(),
      "ipfsUploads",
      uploadId,
    );
  await mkdir(temporaryBlockstorePath, { recursive: true });

  // Setup Blockstore and Helia
  console.log(`Initializing Helia`);
  const temporaryFsBlockstore = new FsBlockstore(temporaryBlockstorePath),
    helia = await createHelia({
      blockstore: temporaryFsBlockstore,
    }),
    heliaFs = unixfs(helia);
  console.log(`Initialized Helia`);

  // Pack Multiple Files into CAR file for upload
  console.log(`Generating Files`);
  let parsedEntries = {};
  const source = [
    {
      path: "/testObjects/1.txt",
      content: Buffer.from("upload test object", "utf-8"),
    },
    {
      path: "/testObjects/deep/1.txt",
      content: Buffer.from("upload deep test object", "utf-8"),
    },
    {
      path: "/topLevel.txt",
      content: Buffer.from("upload top level test object", "utf-8"),
    },
  ];
  console.log(`Generated Files`);

  // Import Objects to Blockstore
  console.log(`Importing`);
  for (let sourceEntry of source) {
    sourceEntry.path =
      sourceEntry.path.startsWith("/")
        ? `/${uploadId}${sourceEntry.path}`
        : `/${uploadId}/${sourceEntry.path}`;
  }
  for await (const entry of heliaFs.addAll(source)) {
    parsedEntries[entry.path] = entry;
  }
  const rootEntry = parsedEntries[uploadId];
  console.log(`Imported`);

  // Export blocks to carFile
  console.log(`Exporting`);
  const carExporter = car(helia),
    { writer, out } = CarWriter.create([rootEntry.cid]),
    output = createWriteStream("example.car");
  Readable.from(out).pipe(output);
  await carExporter.export(rootEntry.cid, writer);
  console.log(`Exported!`);
})();
