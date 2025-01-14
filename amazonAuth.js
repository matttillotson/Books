class AmazonPAAPI {
    constructor() {
        this.accessKey = 'YOUR_ACCESS_KEY';
        this.secretKey = 'YOUR_SECRET_KEY';
        this.partnerTag = 'YOUR_PARTNER_TAG'; // your Associates ID (e.g., mystore-20)
        this.region = 'us-east-1';  // or your appropriate region
        this.host = 'webservices.amazon.com';
        this.service = 'ProductAdvertisingAPI';
    }

    generateHeaders(payload) {
        const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const date = timestamp.substr(0, 8);

        const canonicalRequest = this.createCanonicalRequest(payload, timestamp);
        const stringToSign = this.createStringToSign(canonicalRequest, timestamp);
        const signature = this.calculateSignature(stringToSign, date);

        return {
            'Content-Type': 'application/json',
            'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
            'X-Amz-Date': timestamp,
            'Authorization': this.createAuthHeader(date, signature)
        };
    }

    // ... we'll add the helper methods next
} 