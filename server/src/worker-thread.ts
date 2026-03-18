import { parentPort, workerData } from "worker_threads";
import { faker } from "@faker-js/faker";
import { HOBBIES, NATIONALITIES } from "./db/client";

const { requestId, index } = workerData as { requestId: string; index: number };

setTimeout(() => {
  const result = {
    index,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    age: faker.number.int({ min: 18, max: 80 }),
    nationality: faker.helpers.arrayElement(NATIONALITIES),
    hobbies: faker.helpers.arrayElements(
      HOBBIES,
      faker.number.int({ min: 1, max: 4 }),
    ),
  };

  parentPort?.postMessage({ requestId, result });
}, 2000);
