import { IWebhookEventDoc, WebhookEventModel } from "../models/WebhookEvent.js";

export class WebhookEventRepository {
    async create(data: IWebhookEventDoc): Promise<IWebhookEventDoc> {
        const webhookEvent = await WebhookEventModel.create(data);
        return webhookEvent as unknown as IWebhookEventDoc;
    }

    async findByGatewayAndEventId(gateway: string, eventId: string): Promise<IWebhookEventDoc | null> {
        const doc = await WebhookEventModel.findOne({ gateway, eventId });
        return doc ?? null;
    }
}