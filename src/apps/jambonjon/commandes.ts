/** Appuis discrets dans l'ordre, sans accumuler une longue marche après relâchement. */
export class Commandes<T> {
  private actions: T[] = [];

  ajouter(action: T): void {
    if (this.actions.length < 8) this.actions.push(action);
  }

  suivante(): T | undefined {
    return this.actions.shift();
  }

  vider(): void {
    this.actions = [];
  }
}
