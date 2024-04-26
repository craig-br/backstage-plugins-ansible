import fetch from 'node-fetch';

export class CreatorServiceAPI {
  private readonly creatorServiceUrl: string;

  constructor(creatorServiceUrl: string) {
    this.creatorServiceUrl = creatorServiceUrl;
  }

  async downloadCollection(
    collectionGroup: string,
    collectionName: string,
    applicationType: string
  ): Promise<string> {
    const requestOptions = {
      method: 'GET',
    };

    const url = this.creatorServiceUrl +
      (applicationType === 'playbook-project'
        ? `project=ansible-project&scm_org=${collectionGroup}&scm_project=${collectionName}`
        : `collection=${collectionGroup}.${collectionName}`);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    return response.body;
  }
}
