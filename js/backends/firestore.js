// Backend: Cloud Firestore, one private tree per signed-in user:
//   users/{uid}
//   users/{uid}/vehicles/{vehicleId}
//   users/{uid}/vehicles/{vehicleId}/fuelEntries/{entryId}
// Security rules (firestore.rules) make sure a user can only touch their own tree.

const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch; leave headroom
const WRITE_WAIT_MS = 10000;

export class PendingWrite extends Error {}

/**
 * @param fb   { db, fs } from cloud/firebase.js (fs = Firestore module functions)
 * @param uid  signed-in user's id
 */
export function createFirestoreBackend(fb, uid) {
  const { db, fs } = fb;
  const userRef = fs.doc(db, 'users', uid);
  const vehicleRef = (id) => fs.doc(userRef, 'vehicles', id);
  const entryRef = (e) => fs.doc(userRef, 'vehicles', e.vehicleId, 'fuelEntries', e.id);
  const strip = (x) => JSON.parse(JSON.stringify(x)); // drops undefined values

  async function commit(writes) {
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = fs.writeBatch(db);
      for (const w of writes.slice(i, i + BATCH_LIMIT)) w(batch);
      const done = batch.commit();
      // Offline, Firestore keeps the write queued and the promise waits for the
      // server. Don't freeze the screen: report it as pending instead.
      const timer = new Promise((_, reject) => setTimeout(() => reject(new PendingWrite('pending')), WRITE_WAIT_MS));
      await Promise.race([done, timer]);
    }
  }

  return {
    kind: 'cloud',
    persistent: true,
    uid,

    async load() {
      const now = new Date().toISOString();
      const snap = await fs.getDoc(userRef);
      await fs.setDoc(userRef, snap.exists() ? { updatedAt: now } : { createdAt: now, updatedAt: now }, { merge: true });

      const vSnap = await fs.getDocs(fs.collection(userRef, 'vehicles'));
      const vehicles = vSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
      const entryLists = await Promise.all(vehicles.map((v) => fs.getDocs(fs.collection(userRef, 'vehicles', v.id, 'fuelEntries'))));
      const entries = entryLists.flatMap((s, i) => s.docs.map((d) => ({ ...d.data(), id: d.id, vehicleId: vehicles[i].id })));
      return { version: 1, vehicles, entries };
    },

    /** ops: { putVehicles, putEntries, deleteVehicles, deleteEntries } (full records) */
    async save(ops) {
      const writes = [];
      for (const v of ops.putVehicles || []) writes.push((b) => b.set(vehicleRef(v.id), strip(v)));
      for (const e of ops.putEntries || []) writes.push((b) => b.set(entryRef(e), strip(e)));
      for (const e of ops.deleteEntries || []) writes.push((b) => b.delete(entryRef(e)));
      for (const v of ops.deleteVehicles || []) writes.push((b) => b.delete(vehicleRef(v.id)));
      await commit(writes);
    },
  };
}
