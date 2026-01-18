import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Operator, Message, TTSProvider } from '../types';
import { decode, decodeAudioData } from './audio';

// Chat Generation
export async function generateChatResponse(
  apiKey: string,
  history: Message[],
  operator: Operator,
  isGroup: boolean,
  groupOperators: Operator[] = []
): Promise<{ sender: string, text: string }[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Format history for the model
  const chatHistory = history.map(m => ({
    role: m.role,
    parts: [{ text: m.role === 'model' ? `[${m.senderName}]: ${m.text}` : m.text }]
  }));

  // Construct system prompt
  let sysPrompt = operator.systemPrompt;
  
  // Inject Memory if available
  if (operator.memory) {
    sysPrompt += `\n\n[PERSISTENT MEMORY / CONTEXT]:\n${operator.memory}\n\n`;
  }

  if (isGroup) {
    const participantsInfo = groupOperators.map(op => `Name: ${op.name}\nTraits: ${op.personality}\nContext: ${op.memory || 'None'}`).join('\n---\n');
    sysPrompt = `You are simulating a group chat at Rhodes Island (Arknights). The user is the Doctor.
    
    Current Participants on the Channel:
    ${participantsInfo}
    
    Instructions:
    1. Respond as one or more of the participants based on the user's input and context.
    2. IMPORTANT: You must output a valid JSON array of objects. Each object represents a separate message.
    3. Format: [{"sender": "CharacterName", "text": "Message content..."}, {"sender": "AnotherCharacter", "text": "Reply..."}]
    4. Do not include any markdown formatting (like \`\`\`json) outside the array if possible, just the raw JSON or wrapped in code block.
    5. Maintain accurate character personalities.
    `;
  } else {
    // Single chat instructions ensuring memory usage
    sysPrompt += `\n\nSystem: You are currently talking to the Doctor. Use the provided Memory/Context to maintain continuity.`;
  }

  // Using Pro model for better reasoning over large contexts (2M+ tokens capability)
  const model = 'gemini-3-pro-preview';

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: chatHistory,
        config: {
            systemInstruction: sysPrompt,
            temperature: 0.8,
            responseMimeType: isGroup ? "application/json" : "text/plain", 
        }
    });

    const textResponse = response.text || "...";

    if (isGroup) {
        try {
            // Attempt to parse JSON
            let cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const messages = JSON.parse(cleanJson);
            if (Array.isArray(messages)) {
                return messages.map((m: any) => ({ sender: m.sender, text: m.text }));
            }
            return [{ sender: 'System', text: textResponse }];
        } catch (e) {
            console.error("Failed to parse group chat JSON", e);
            return [{ sender: 'System', text: textResponse }];
        }
    } else {
        return [{ sender: operator.name, text: textResponse }];
    }

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return [{ sender: 'System', text: "Connection to PRTS Neural Network interrupted." }];
  }
}

export async function generateSummary(
    apiKey: string,
    history: Message[]
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const contentText = history.slice(-50).map(m => `${m.senderName}: ${m.text}`).join('\n'); // Summarize last 50 messages for better context
    
    const prompt = `Summarize the following Arknights roleplay conversation into a concise memory log (max 500 words). 
    Focus on key events, decisions made by the Doctor, and emotional shifts of the operators. 
    This summary will be used as context for future conversations.
    
    Conversation:
    ${contentText}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text || "";
    } catch (error) {
        return "Summary generation failed.";
    }
}

interface TTSConfig {
    provider: TTSProvider;
    apiKey: string;
    customUrl?: string;
}

// Speech Generation
export async function generateSpeech(
  text: string,
  voiceId: string,
  config: TTSConfig
): Promise<AudioBuffer | null> {
  
  // --- CUSTOM TTS (GPT-SoVITS) ---
  if (config.provider === 'custom' && config.customUrl) {
    try {
        const url = new URL(config.customUrl);
        // Standard GPT-SoVITS simple API format
        url.searchParams.append('text', text);
        url.searchParams.append('text_language', 'zh'); // Defaulting to zh/en based on simple detection or just zh
        url.searchParams.append('character', voiceId);
        url.searchParams.append('speaker', voiceId);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Custom TTS request failed");
        
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); // Sample rate might vary
        return await audioContext.decodeAudioData(arrayBuffer);

    } catch (error) {
        console.error("Custom TTS Error:", error);
        return null;
    }
  }

  // --- GEMINI TTS (DEFAULT) ---
  if (!config.apiKey) return null;
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId || 'Puck' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext
    );
    return audioBuffer;

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}