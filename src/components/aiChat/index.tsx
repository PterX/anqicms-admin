import { getAiHistories } from '@/services';
import config from '@/services/config';
import { getSessionStore, getStore, setStore } from '@/utils/store';
import {
  CloseOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import gfm from '@bytemd/plugin-gfm';
import { Viewer } from '@bytemd/react';
import { useIntl } from '@umijs/max';
import { Alert, Button, Input, Modal, Spin, message } from 'antd';
import 'bytemd/dist/index.css';
import { useEffect, useRef, useState } from 'react';
import './index.less';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

type SegmentType = 'reasoning' | 'text' | 'tool_call' | 'warning';

interface Segment {
  type: SegmentType;
  /** 用于 reasoning / text / warning */
  content?: string;
  /** 用于 tool_call */
  toolName?: string;
  toolCallId?: string;
  arguments?: string;
  status?: 'calling' | 'completed';
  result?: string;
}

interface Message {
  role: 'user' | 'assistant';
  segments: Segment[];
  timestamp: number;
}

interface AiChatProps {
  visible: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

/** 思维链条折叠展示 */
const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ai-chat-thinking">
      <div
        className="ai-chat-thinking-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`ai-chat-thinking-arrow ${expanded ? 'expanded' : ''}`}
        >
          ▶
        </span>
        <span className="ai-chat-thinking-label">已思考</span>
      </div>
      {expanded && (
        <div className="ai-chat-thinking-body">
          <pre>{content}</pre>
        </div>
      )}
    </div>
  );
};

/** 单个工具调用块 */
const ToolCallBlock: React.FC<{
  toolName: string;
  arguments: string;
  status: 'calling' | 'completed';
  result?: string;
}> = ({ toolName: name, arguments: args, status: st, result: res }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="ai-chat-toolcall"
      style={{
        margin: '4px 0',
        padding: '6px 8px',
        background: '#f5f5f5',
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div
        className="ai-chat-toolcall-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span
          className={`ai-chat-thinking-arrow ${expanded ? 'expanded' : ''}`}
        >
          ▶
        </span>
        {st === 'calling' ? '🔄' : '✅'} <strong>{name}</strong>
        {st === 'calling' ? ' 进行中...' : ''}
      </div>
      {expanded && (
        <div className="ai-chat-toolcall-body" style={{ marginTop: 4 }}>
          <pre
            style={{
              fontSize: 12,
              background: '#fff',
              padding: 4,
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
            }}
          >
            {args.length > 200 ? args.slice(0, 200) + '...' : args}
          </pre>
          {res && (
            <pre
              style={{
                fontSize: 12,
                background: '#f6ffed',
                padding: 4,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: '4px 0 0 0',
              }}
            >
              {res.length > 300 ? res.slice(0, 300) + '...' : res}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

/** 系统警告 */
const WarningBlock: React.FC<{ message: string }> = ({ message: msg }) => (
  <div className="ai-chat-warning">
    <span className="ai-chat-warning-icon">⚠️</span>
    <span className="ai-chat-warning-text">{msg}</span>
  </div>
);

/** 将后端历史 ChatMessage[] 转换为前端 Message[]（含 segments） */
function convertHistoryMessages(raw: any[]): Message[] {
  const result: Message[] = [];
  let pending: { msg: Message; segIdx: number } | null = null;

  for (const item of raw) {
    if (!item || !item.role) continue;

    // user → 直接产出完整 message
    if (item.role === 'user') {
      pending = null;
      result.push({
        role: 'user',
        segments: [{ type: 'text' as const, content: item.content || '' }],
        timestamp: item.created_time || item.timestamp || Date.now(),
      });
      continue;
    }

    // assistant → 新建一个 assistant message，后续 tool 消息会追加到它
    if (item.role === 'assistant') {
      const segs: Segment[] = [];
      const ts = item.created_time || item.timestamp || Date.now();

      // 如果有 tool_calls（JSON 字符串），解析为 tool_call segment
      if (item.tool_calls) {
        try {
          const calls =
            typeof item.tool_calls === 'string'
              ? JSON.parse(item.tool_calls)
              : item.tool_calls;
          if (Array.isArray(calls)) {
            calls.forEach((tc: any) => {
              const fn = tc.function || tc;
              segs.push({
                type: 'tool_call',
                toolName: fn.name || '',
                toolCallId: tc.id || tc.tool_call_id || '',
                arguments:
                  typeof fn.arguments === 'object'
                    ? JSON.stringify(fn.arguments)
                    : fn.arguments || '',
                status: 'completed',
                result: undefined,
              });
            });
          }
        } catch {
          /* ignore parse errors */
        }
      }

      // 如果有 thinking/推理内容
      if (item.thinking) {
        segs.push({ type: 'reasoning', content: item.thinking });
      }

      // 如果有文本内容
      if (item.content) {
        segs.push({ type: 'text', content: item.content });
      }

      const msg: Message = { role: 'assistant', segments: segs, timestamp: ts };
      result.push(msg);

      // 记住当前 assistant message，后续 tool 结果需要更新它
      const lastToolSegIdx = segs.findLastIndex((s) => s.type === 'tool_call');
      pending = lastToolSegIdx >= 0 ? { msg, segIdx: lastToolSegIdx } : null;
      continue;
    }

    // tool → 将结果回填到上一个 pending 的 tool_call segment 上
    if (item.role === 'tool' && pending) {
      const seg = pending.msg.segments[pending.segIdx];
      if (
        seg &&
        seg.type === 'tool_call' &&
        seg.toolCallId === item.tool_call_id
      ) {
        seg.status = 'completed';
        seg.result =
          typeof item.result === 'object'
            ? JSON.stringify(item.result)
            : item.result || item.content || '';
      }
      // 继续向前寻找同一个 pending.msg 里的下一个 tool_call
      const nextIdx = pending.msg.segments.findLastIndex(
        (s, i) => s.type === 'tool_call' && i > pending!.segIdx,
      );
      if (nextIdx >= 0) {
        pending.segIdx = nextIdx;
      } else {
        // 重新从头找第一个未完成的
        const firstPending = pending.msg.segments.findIndex(
          (s) => s.type === 'tool_call' && s.status === 'calling',
        );
        pending.segIdx = firstPending >= 0 ? firstPending : pending.segIdx;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

const AiChat: React.FC<AiChatProps> = ({ visible, onClose }) => {
  const intl = useIntl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionId, setSessionId] = useState(getStore('aiSessionId') || '');
  const [maximized, setMaximized] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configTemplate, setConfigTemplate] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeShownRef = useRef(false);
  const handleNewSession = () => {
    setMessages([]);
    setSessionId('');
    setStore('aiSessionId', '');
    welcomeShownRef.current = false;
  };

  // 取消配置
  const handleConfigCancel = () => {
    setConfigModalVisible(false);
  };

  // 打开组件时检查 sessionId，不存在则显示欢迎，存在则从服务器加载历史
  useEffect(() => {
    if (!visible) return;
    if (welcomeShownRef.current) return;
    welcomeShownRef.current = true;

    const cachedSessionId = getStore('aiSessionId');
    if (cachedSessionId) {
      setHistoryLoading(true);
      getAiHistories({ session_id: cachedSessionId })
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMessages(convertHistoryMessages(res.data));
          } else {
            setMessages([]);
          }
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    } else {
      setMessages([
        {
          role: 'assistant',
          segments: [
            {
              type: 'text',
              content:
                '你好！我是安企 CMS AI 助手。我可以帮你管理文章、分类、标签和附件。\n\n输入 help 查看可用命令。',
            },
          ],
          timestamp: Date.now(),
        },
      ]);
    }
  }, [visible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // =====================================================================
  // handleSend — SSE 流式处理，按 SSE 事件到达顺序构建 segments
  // =====================================================================
  const handleSend = async (overrideMessage?: string) => {
    message.warning('AI功能还在开发中，请耐心等待下次更新');
    return;

    const messageContent = (overrideMessage || inputValue).trim();
    if (!messageContent || loading) return;
    setInputValue('');
    setLoading(true);

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      segments: [{ type: 'text', content: messageContent }],
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    // 重置错误消息
    setErrorMsg('');

    try {
      let adminToken = getStore('adminToken');
      const sessionToken = getSessionStore('adminToken');
      if (sessionToken) {
        adminToken = sessionToken;
      }

      const response = await fetch(config.baseUrl + '/anqi/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Admin: adminToken,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 检查响应类型：如果返回的是 JSON（非 SSE），说明需要特殊处理
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const jsonResp = await response.json();
        throw new Error(jsonResp.msg || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // ----- 时间线 segments（当前 assistant message） -----
      // 每个 SSE 事件按到达顺序追加/更新这个数组
      let segments: Segment[] = [];

      // 更新 React state 的封装
      const flushSegments = () => {
        if (segments.length === 0) return;
        setMessages((prev) => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last && last.role === 'assistant') {
            newMsgs[newMsgs.length - 1] = { ...last, segments: [...segments] };
          } else {
            newMsgs.push({
              role: 'assistant',
              segments: [...segments],
              timestamp: Date.now(),
            });
          }
          return newMsgs;
        });
      };

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const event of events) {
              if (!event.trim()) continue;

              const lines = event.split('\n');
              let eventType = 'message';
              let data = '';

              for (const line of lines) {
                if (line.startsWith('event:')) {
                  eventType = line.substring(6).trim();
                } else if (line.startsWith('data:')) {
                  data = line.substring(5).trim();
                }
              }

              if (eventType === 'session' && data) {
                setSessionId(data);
                setStore('aiSessionId', data);
                continue;
              }

              if (eventType === 'config' && data) {
                let jsonResp = JSON.parse(data);
                let jsonData = JSON.stringify(jsonResp, null, 2);
                // AI 接口未配置，弹出配置对话框
                setConfigTemplate(jsonData);
                setConfigJson(jsonData);
                setConfigModalVisible(true);
                setLoading(false);
                continue;
              }

              // ---- 以下事件都按到达顺序追加/修改 segments ----

              // 确保至少有一个 assistant message
              // const ensureAssistant = () => {
              //   if (segments.length === 0) {
              //     // 还没有任何 segment，先检查 messages 最后一条是否已经是 assistant
              //     // 但为了简化，直接让 flushSegments 处理
              //   }
              // };

              try {
                const parsed = JSON.parse(data || '{}');

                // reasoning —— 如果上一个 segment 也是 reasoning 则拼接到尾部，否则追加
                if (eventType === 'reasoning' && parsed.v !== undefined) {
                  const last = segments[segments.length - 1];
                  if (last && last.type === 'reasoning') {
                    last.content = (last.content || '') + parsed.v;
                  } else {
                    segments.push({
                      type: 'reasoning',
                      content: parsed.v,
                    });
                  }
                  flushSegments();
                  continue;
                }

                // message (文本内容) —— 与 reasoning 同理
                if (eventType === 'message' && parsed.v !== undefined) {
                  const last = segments[segments.length - 1];
                  if (last && last.type === 'text') {
                    last.content = (last.content || '') + parsed.v;
                  } else {
                    segments.push({
                      type: 'text',
                      content: parsed.v,
                    });
                  }
                  flushSegments();
                  continue;
                }

                // tool_call —— 追加（可能多个工具并行）
                if (eventType === 'tool_call') {
                  segments.push({
                    type: 'tool_call',
                    toolName: parsed.name || '',
                    toolCallId: parsed.tool_call_id || '',
                    arguments:
                      typeof parsed.arguments === 'object'
                        ? JSON.stringify(parsed.arguments)
                        : parsed.arguments || '',
                    status: 'calling',
                    result: undefined,
                  });
                  flushSegments();
                  continue;
                }

                // tool_result —— 找到对应的 tool_call 更新其状态
                if (eventType === 'tool_result') {
                  const toolCallId = parsed.tool_call_id;
                  if (toolCallId) {
                    for (let i = segments.length - 1; i >= 0; i--) {
                      const seg = segments[i];
                      if (
                        seg.type === 'tool_call' &&
                        seg.toolCallId === toolCallId
                      ) {
                        seg.status = 'completed';
                        seg.result =
                          typeof parsed.result === 'object'
                            ? JSON.stringify(parsed.result)
                            : parsed.result || '';
                        break;
                      }
                    }
                  }
                  flushSegments();
                  continue;
                }

                // warning —— 追加
                if (eventType === 'warning' && (parsed.message || parsed.v)) {
                  segments.push({
                    type: 'warning',
                    content: parsed.message || parsed.v || '',
                  });
                  flushSegments();
                  continue;
                }

                // error —— 作为 text 追加
                if (eventType === 'error') {
                  const errMsg = parsed.message?.content || 'An error occurred';
                  segments.push({ type: 'text', content: errMsg });
                  flushSegments();
                  continue;
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        } finally {
          reader.releaseLock();
          setLoading(false);
        }
      };

      await readStream();
    } catch (error: any) {
      console.error('Chat error:', error);
      message.error(error.message || '发送失败，请重试');
      setErrorMsg(error.message || '发送失败，请重试');
      setLoading(false);
    }
  };

  // 提交 AI 配置
  const handleConfigSubmit = () => {
    const trimmed = configJson.trim();
    if (!trimmed) {
      message.warning('请填写 AI 配置 JSON');
      return;
    }
    // 验证是否为合法 JSON
    try {
      JSON.parse(trimmed);
    } catch {
      message.error('JSON 格式无效，请检查后重试');
      return;
    }
    setConfigModalVisible(false);
    // 将 JSON 作为消息直接发送（绕过 inputValue state 的异步延迟）
    handleSend('config:' + trimmed);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!visible) return null;

  // =====================================================================
  // 渲染单个 segment
  // =====================================================================
  const renderSegment = (seg: Segment, segIdx: number) => {
    switch (seg.type) {
      case 'reasoning':
        return (
          <ThinkingBlock key={`seg-${segIdx}`} content={seg.content || ''} />
        );
      case 'text':
        return seg.content ? (
          <Viewer key={`seg-${segIdx}`} value={seg.content} plugins={[gfm()]} />
        ) : null;
      case 'tool_call':
        return (
          <ToolCallBlock
            key={`seg-${segIdx}`}
            toolName={seg.toolName || ''}
            arguments={seg.arguments || ''}
            status={seg.status || 'calling'}
            result={seg.result}
          />
        );
      case 'warning':
        return (
          <WarningBlock key={`seg-${segIdx}`} message={seg.content || ''} />
        );
      default:
        return null;
    }
  };

  // =====================================================================
  // JSX
  // =====================================================================
  return (
    <div className={`ai-chat-modal${maximized ? ' maximized' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <svg
            className="ai-chat-icon"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
          >
            <path
              d="M521.47 859.38c-63.86 0-127.41-8.29-189.15-24.55h-125.9c-15.16 0.1-29.61-6.37-39.51-17.78s-14.35-26.57-12.23-41.63l14.25-100.74c-22.94-37.49-36.48-96.5-40.32-176.02-10.1-183.8 109.23-349.81 286.76-398.71 39-9.9 79.22-14.85 119.43-14.65 118.52 0 217.64 37.08 286.56 107.51s107.71 176.52 106.09 294.64c-0.3 57.39-12.93 114.08-37.08 166.11-80.22 167.63-239.97 205.62-368.9 205.82z"
              fill="#fff"
            />
            <path
              d="M540.57 574.74l-13.14-34.76H415.18l-13.34 35.26c-3.23 9.8-7.58 19.2-13.14 27.99-4.34 5.25-11.11 7.98-17.99 7.38-7.17 0.2-14.25-2.63-19.3-7.68a23.851 23.851 0 0 1-8.08-17.58c0.1-3.94 0.71-7.78 1.92-11.62 1.31-4.04 3.23-9.7 6.16-16.77l70.83-179.45c1.92-5.25 4.45-11.42 7.17-19.3 2.32-6.37 5.36-12.33 9.09-17.99 3.23-4.85 7.48-8.79 12.53-11.62 17.48-10.41 40.01-5.36 51.53 11.42 3.23 4.65 5.96 9.6 8.08 14.85l8.49 21.42 72.25 178.44c5.05 9.4 8.29 19.7 9.7 30.31-0.1 6.77-2.93 13.14-7.88 17.78-5.05 5.15-12.02 7.98-19.3 7.88-3.94 0.1-7.78-0.71-11.42-2.32-3.03-1.52-5.76-3.64-7.88-6.37-2.83-3.84-5.05-8.08-6.77-12.53-3.32-5.44-4.73-10.49-7.26-14.74z m-110.74-77.19h82.35l-41.53-114.08-40.82 114.08z m213.8 78.91V358.82a36.171 36.171 0 0 1 7.68-25.26c4.95-5.46 11.92-8.59 19.3-8.49 7.68-0.3 15.16 2.73 20.41 8.29 5.66 7.17 8.49 16.27 7.68 25.46v217.64c0.81 9.19-2.02 18.39-7.68 25.66-5.25 5.66-12.73 8.79-20.41 8.49-7.38 0-14.35-3.03-19.3-8.49-5.66-7.27-8.39-16.36-7.68-25.66z"
              fill="#fff"
            />
          </svg>
          <span>AI 助手</span>
        </div>
        <div
          className="ai-chat-header-actions"
          style={{ display: 'flex', gap: 4, alignItems: 'center' }}
        >
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleNewSession}
          />
          <Button
            type="text"
            icon={
              maximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            onClick={() => setMaximized(!maximized)}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="ai-chat-close"
          />
        </div>
      </div>

      <div className="ai-chat-messages">
        {historyLoading && (
          <div className="ai-chat-message assistant">
            <div className="ai-chat-message-content">
              <Spin size="small" /> 加载历史记录...
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`ai-chat-message ${
              msg.role === 'user' ? 'user' : 'assistant'
            }`}
          >
            <div className="ai-chat-message-content">
              {msg.role === 'assistant' ? (
                msg.segments.length === 0 ? (
                  <Spin size="small" />
                ) : (
                  msg.segments.map((seg, si) => renderSegment(seg, si))
                )
              ) : (
                /* user message — 直接显示文本内容 */
                msg.segments.map((seg, si) =>
                  seg.type === 'text' ? (
                    <span key={`seg-${si}`}>{seg.content}</span>
                  ) : null,
                )
              )}
            </div>
          </div>
        ))}
        {loading &&
          messages.every(
            (m) => m.role !== 'assistant' || m.segments.length === 0,
          ) && (
            <div className="ai-chat-message assistant">
              <div className="ai-chat-message-content">
                <Spin size="small" />
              </div>
            </div>
          )}
        {errorMsg && <Alert type="error" message={errorMsg} />}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleKeyPress}
          placeholder="输入消息..."
          disabled={loading}
          allowClear
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => handleSend()}
          loading={loading}
          disabled={!inputValue.trim()}
          className="ai-chat-send"
        />
      </div>

      {/* AI 配置弹窗 */}
      <Modal
        title="配置 AI 接口"
        open={configModalVisible}
        onOk={handleConfigSubmit}
        onCancel={handleConfigCancel}
        okText="保存并发送"
        cancelText="取消"
        confirmLoading={configSaving}
        width={640}
      >
        <p style={{ marginBottom: 8, color: '#666' }}>
          AI 接口尚未配置。请修改以下 JSON 中的 <code>api_key</code>{' '}
          为你的密钥，其它字段可按需调整。
        </p>
        <Input.TextArea
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={12}
          style={{
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        />
      </Modal>
    </div>
  );
};

export default AiChat;
