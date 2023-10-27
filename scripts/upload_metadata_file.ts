import { getWalletSuite, uploadMetadataFile } from "./helpers";

(async () => {
  const { metaplex } = await getWalletSuite("devnet", false);
  const result = await uploadMetadataFile(
    metaplex,
    "LABOFI",
    "Labofi_Profile",
    "test_image.png",
    "bronze"
  );
  console.log(result);
})();
