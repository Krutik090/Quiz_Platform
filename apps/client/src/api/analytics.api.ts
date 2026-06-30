import type { EventAnalytics, ExportFormat } from "@tribastion/shared";
import { apiClient } from "@/lib/api-client";

export const analyticsApi = {
  async getEventAnalytics(eventId: string) {
    const { data } = await apiClient.get<{ analytics: EventAnalytics }>(`/analytics/events/${eventId}`);
    return data.analytics;
  },

  /** Protected route requires a Bearer header, so exports are fetched as a blob rather than navigated to directly. */
  async downloadExport(eventId: string, format: ExportFormat) {
    const { data, headers } = await apiClient.get<Blob>(`/analytics/events/${eventId}/export/${format}`, {
      responseType: "blob",
    });
    const disposition = headers["content-disposition"] as string | undefined;
    const filenameMatch = disposition?.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] ?? `event-${eventId}.${format}`;

    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
