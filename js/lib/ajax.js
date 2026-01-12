export class Ajax {
    constructor(options = {}) {
        this.baseURL = options.baseURL || '';
        this.defaultTimeout = options.timeout || 5000;
    }

    async request(url, method, data = null) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.defaultTimeout);

        const config = {
            method: method,
            signal: controller.signal,
            headers: {},
        };

        if (data) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            clearTimeout(id);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    async get(url) {
        return this.request(url, 'GET');
    }
}
