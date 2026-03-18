# Presight Frontend Exercise

## Video Demo [Presight Video](https://github.com/user-attachments/assets/bf8bb070-7acc-4cca-b1e9-f3dcd46ec305)

The video walkthrough demonstrates all three tasks running in the completed application:

1. **Paginated List with Filters & Search** — A virtualized list of user cards rendered using `@tanstack/react-virtual` with infinite scroll. Each card displays an avatar, full name, nationality, age, and up to 2 hobbies with a `+n` overflow count. A sidebar exposes the top 20 hobbies and nationalities as toggleable filters, alongside a search box that filters by first or last name in real time.

2. **Streaming Text Display** — A live character-by-character rendering of a streamed HTTP response. While the stream is open, each character is appended to the display as it arrives. Once the stream closes, the full response is rendered in its entirety.

3. **WebWorker + WebSocket Processing** — Twenty requests are dispatched simultaneously, each initially displaying `pending`. Requests are queued server-side and processed in a Web Worker, which pushes results back to the client over a WebSocket connection. Each item updates from `pending` to its result as the corresponding socket message is received.
