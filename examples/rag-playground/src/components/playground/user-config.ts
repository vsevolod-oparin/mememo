import { get, set, del, clear } from 'idb-keyval';

const PREFIX = 'user-config';

export enum SupportedLocalModel {
  'gemma-2b' = 'Gemma (2B)',
  'llama-2-7b' = 'Llama 2 (7B)',
  'phi-2' = 'Phi 2 (2.7B)',
  'phi-3' = 'Phi 3 (2.1B)',
  'tinyllama-1.1b' = 'TinyLlama (1.1B)'
}

export enum SupportedRemoteModel {
  'gpt-3.5-free' = 'GPT 3.5',
  'gpt-3.5' = 'GPT 3.5 (Token)',
  'gpt-4' = 'GPT 4',
  'gemini-pro' = 'Gemini Pro',
  'deepseek-chat' = 'DeepSeek Chat',
  'deepseek-coder' = 'DeepSeek Coder'
}

export const supportedModelReverseLookup: Record<
  SupportedRemoteModel | SupportedLocalModel,
  keyof typeof SupportedRemoteModel | keyof typeof SupportedLocalModel
> = {
  [SupportedRemoteModel['gpt-3.5-free']]: 'gpt-3.5-free',
  [SupportedRemoteModel['gpt-3.5']]: 'gpt-3.5',
  [SupportedRemoteModel['gpt-4']]: 'gpt-4',
  [SupportedRemoteModel['gemini-pro']]: 'gemini-pro',
  [SupportedRemoteModel['deepseek-chat']]: 'deepseek-chat',
  [SupportedRemoteModel['deepseek-coder']]: 'deepseek-coder',
  [SupportedLocalModel['tinyllama-1.1b']]: 'tinyllama-1.1b',
  [SupportedLocalModel['llama-2-7b']]: 'llama-2-7b',
  [SupportedLocalModel['phi-2']]: 'phi-2',
  [SupportedLocalModel['phi-3']]: 'phi-3',
  [SupportedLocalModel['gemma-2b']]: 'gemma-2b'
};

export enum ModelFamily {
  google = 'Google',
  openAI = 'Open AI',
  deepseek = 'DeepSeek',
  local = 'Local'
}

export const modelFamilyMap: Record<
  SupportedRemoteModel | SupportedLocalModel,
  ModelFamily
> = {
  [SupportedRemoteModel['gpt-3.5']]: ModelFamily.openAI,
  [SupportedRemoteModel['gpt-3.5-free']]: ModelFamily.openAI,
  [SupportedRemoteModel['gpt-4']]: ModelFamily.openAI,
  [SupportedRemoteModel['gemini-pro']]: ModelFamily.google,
  [SupportedRemoteModel['deepseek-chat']]: ModelFamily.deepseek,
  [SupportedRemoteModel['deepseek-coder']]: ModelFamily.deepseek,
  [SupportedLocalModel['tinyllama-1.1b']]: ModelFamily.local,
  [SupportedLocalModel['llama-2-7b']]: ModelFamily.local,
  [SupportedLocalModel['gemma-2b']]: ModelFamily.local,
  [SupportedLocalModel['phi-2']]: ModelFamily.local,
  [SupportedLocalModel['phi-3']]: ModelFamily.local
};

export interface UserConfig {
  llmAPIKeys: Record<ModelFamily, string>;
  preferredLLM: SupportedRemoteModel | SupportedLocalModel;
}

export class UserConfigManager {
  restoreFinished: Promise<void>;
  updateUserConfig: (userConfig: UserConfig) => void;

  #llmAPIKeys: Record<ModelFamily, string>;
  #preferredLLM: SupportedRemoteModel | SupportedLocalModel;

  constructor(updateUserConfig: (userConfig: UserConfig) => void) {
    this.updateUserConfig = updateUserConfig;

    this.#llmAPIKeys = {
      [ModelFamily.openAI]: '',
      [ModelFamily.google]: '',
      [ModelFamily.deepseek]: '',
      [ModelFamily.local]: ''
    };
    this.#preferredLLM = SupportedRemoteModel['gpt-3.5-free'];
    this._broadcastUserConfig();

    this.restoreFinished = this._restoreFromStorage();

    // this._cleanStorage();
  }

  setAPIKey(modelFamily: ModelFamily, key: string) {
    this.#llmAPIKeys[modelFamily] = key;
    this._syncStorage().then(
      () => {},
      () => {}
    );
    this._broadcastUserConfig();
  }

  setPreferredLLM(model: SupportedRemoteModel | SupportedLocalModel) {
    this.#preferredLLM = model;
    this._syncStorage().then(
      () => {},
      () => {}
    );
    this._broadcastUserConfig();
  }

  /**
   * Reconstruct the prompts from the local storage.
   */
  async _restoreFromStorage() {
    // Restore the local prompts
    const config = (await get(PREFIX)) as UserConfig | undefined;
    if (config) {
      this.#llmAPIKeys = config.llmAPIKeys;
      this.#preferredLLM = config.preferredLLM;
    }
    this._broadcastUserConfig();
  }

  /**
   * Store the current config to local storage
   */
  async _syncStorage() {
    const config = this._constructConfig();
    await set(PREFIX, config);
  }

  /**
   * Create a copy of the user config
   * @returns User config
   */
  _constructConfig(): UserConfig {
    const config: UserConfig = {
      llmAPIKeys: this.#llmAPIKeys,
      preferredLLM: this.#preferredLLM
    };
    return config;
  }

  /**
   * Clean the local storage
   */
  async _cleanStorage() {
    await del(PREFIX);
  }

  /**
   * Update the public user config
   */
  _broadcastUserConfig() {
    const newConfig = this._constructConfig();
    this.updateUserConfig(newConfig);
  }
}
