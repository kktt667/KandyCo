export class RedPillAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCompletion(model: string, messages: { role: string; content: string }[], files?: File[]) {
    const formData = new FormData();
    formData.append('model', model);
    formData.append('messages', JSON.stringify(messages));

    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
    }

    const response = await fetch('https://api.red-pill.ai/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to get completion from RedPill API');
    }

    return await response.json();
  }

  async getModels() {
    const response = await fetch('https://api.red-pill.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models from RedPill API');
    }

    return await response.json();
  }
}

