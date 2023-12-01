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
import { once } from "node:events";
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
  const temporaryFsBlockstore = new FsBlockstore(temporaryBlockstorePath),
    helia = await createHelia(),
    heliaFs = unixfs({
      blockstore: temporaryFsBlockstore,
    });

  // Pack Multiple Files into CAR file for upload
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

  // Import Objects to Blockstore
  for (let sourceEntry of source) {
    sourceEntry.path =
      sourceEntry.path[0] === "/"
        ? `/${uploadId}${sourceEntry.path}`
        : `/${uploadId}/${sourceEntry.path}`;
  }
  for await (const entry of heliaFs.addAll(source)) {
    parsedEntries[entry.path] = entry;
  }
  const rootEntry = parsedEntries[uploadId];

  // Export blocks to carFile
  const carExporter = car(helia);
  const { writer, out } = CarWriter.create([rootEntry.cid]);
  const exportProcess = carExporter.export(rootEntry.cid, writer);
  const output = createWriteStream("example.car"),
    eventPromise = once(output, "end");
  Readable.from(out).pipe(output);
  await exportProcess;
  await eventPromise;
  console.log(`Uploaded!!!`);
})();
