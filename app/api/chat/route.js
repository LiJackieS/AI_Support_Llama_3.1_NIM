import {NextResponse} from 'next/server';
import OpenAI from 'openai';

const systemPrompt = 'You are a customer support AI bot for a gym front desk. Your primary goal is to assist gym members and potential customers with their inquiries... (rest of the system prompt)';

export async function POST(req) {
    const openai = new OpenAI({
        apiKey: process.env.NVIDIA_API_KEY,  // Ensure you have this API key stored in environment variables
        baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const data = await req.json();  // Parse the JSON body of the incoming request

    // Create a chat completion request to the Nvidia API (Llama 3.1 NiM)
    const completion = await openai.chat.completions.create({
        model: 'meta/llama-3.1-405b-instruct',  // Use Llama 3.1 NiM
        messages: [{ role: 'system', content: systemPrompt }, ...data],  // Include the system prompt and user messages
        temperature: 0.2,  // You can tweak temperature and other settings as needed
        top_p: 0.7,
        max_tokens: 1024,
        stream: true,  // Enable streaming responses
    });

    // Create a ReadableStream to handle the streaming response
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();  // Create a TextEncoder to convert strings to Uint8Array
            try {
                // Iterate over the streamed chunks of the response
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;  // Extract the content from the chunk
                    if (content) {
                        const text = encoder.encode(content);  // Encode the content to Uint8Array
                        controller.enqueue(text);  // Enqueue the encoded text to the stream
                    }
                }
            } catch (err) {
                controller.error(err);  // Handle any errors that occur during streaming
            } finally {
                controller.close();  // Close the stream when done
            }
        },
    });

    return new NextResponse(stream);  // Return the stream as the response
}
