import { DynamoAdapter } from "../dynamo-adapter.js";
import { runStorageContractSuite } from "./contract.suite.js";
import { createMockDocClient } from "./mock-dynamo.js";

runStorageContractSuite("DynamoAdapter", async () => {
  const { docClient } = createMockDocClient();
  const adapter = new DynamoAdapter({
    tableName: "loadbearing-test",
    docClient,
  });

  return { adapter };
});
