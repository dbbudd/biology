/** A provider that can complete a prompt returns raw JSON from the model. */
export interface Completion {
  system: string;
  user: string;
}

export interface ModelProvider {
  id: string;
  label: string;
  model?: string;
  available(): Promise<boolean>;
  complete(request: Completion): Promise<unknown>;
}
