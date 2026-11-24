import { FamilyRepository } from "./repository";
import { InMemoryRepository } from "./inMemoryRepository";
import { FirestoreRepository } from "./firestoreRepository";
import { isLocalDevMode } from "../firebase/config";

let repositoryInstance: FamilyRepository | null = null;

export const getRepository = (): FamilyRepository => {
  if (repositoryInstance) return repositoryInstance;

  if (isLocalDevMode()) {
    repositoryInstance = new InMemoryRepository();
  } else {
    try {
      repositoryInstance = new FirestoreRepository();
    } catch (e) {
      console.warn("Firestore initialization failed, defaulting to InMemoryRepository", e);
      repositoryInstance = new InMemoryRepository();
    }
  }

  return repositoryInstance;
};
