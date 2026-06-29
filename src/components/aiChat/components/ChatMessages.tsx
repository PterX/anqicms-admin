import { PaperClipOutlined } from '@ant-design/icons';
import gfm from '@bytemd/plugin-gfm';
import { Viewer } from '@bytemd/react';
import { Alert, Spin } from 'antd';
import 'bytemd/dist/index.css';
import { Message, Segment } from '../types';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';
import WarningBlock from './WarningBlock';

const gfmPlugin = gfm();

/** 渲染单个 segment */
function renderSegment(seg: Segment, segIdx: number) {
  switch (seg.type) {
    case 'reasoning':
      return (
        <ThinkingBlock key={`seg-${segIdx}`} content={seg.content || ''} />
      );
    case 'text':
      return seg.content ? (
        <Viewer
          key={`seg-${segIdx}`}
          value={seg.content}
          plugins={[gfmPlugin]}
        />
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
      return <WarningBlock key={`seg-${segIdx}`} message={seg.content || ''} />;
    default:
      return null;
  }
}

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  historyLoading: boolean;
  errorMsg: string;
  onSend: (msg: string) => void;
  messagesEndRef: React.Ref<HTMLDivElement>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
  onSend,
  historyLoading,
  errorMsg,
  messagesEndRef,
}) => {
  // 欢迎界面
  if (!historyLoading && messages.length === 0) {
    return (
      <div className="ai-chat-messages">
        <div className="ai-chat-welcome">
          <div className="ai-chat-welcome-title">有什么我能帮你的吗？</div>
          <div className="ai-chat-welcome-actions">
            <div className="ai-chat-welcome-actions-title">常用功能</div>
            <div className="ai-chat-welcome-actions-grid">
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('帮我写一篇文章')}
              >
                <span className="action-icon">📝</span>
                <span className="action-label">创建文章</span>
              </div>
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('查看最近发布的文章')}
              >
                <span className="action-icon">📋</span>
                <span className="action-label">查看文章</span>
              </div>
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('帮我管理分类')}
              >
                <span className="action-icon">📂</span>
                <span className="action-label">管理分类</span>
              </div>
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('帮我修改模板')}
              >
                <span className="action-icon">🎨</span>
                <span className="action-label">修改模板</span>
              </div>
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('帮我翻译文章')}
              >
                <span className="action-icon">🌐</span>
                <span className="action-label">翻译文章</span>
              </div>
              <div
                className="ai-chat-welcome-action-item"
                onClick={() => onSend('help')}
              >
                <span className="action-icon">💡</span>
                <span className="action-label">查看帮助</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
              /* user message — 显示文件附件 + 文本内容 */
              <>
                {msg.files && msg.files.length > 0 && (
                  <div className="ai-chat-user-files">
                    {msg.files.map((f, fi) => (
                      <span key={fi} className="ai-chat-user-file-tag">
                        <PaperClipOutlined /> {f.file_name}
                      </span>
                    ))}
                  </div>
                )}
                {msg.segments.map((seg, si) =>
                  seg.type === 'text' ? (
                    <span key={`seg-${si}`}>{seg.content}</span>
                  ) : null,
                )}
              </>
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
      <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
};

export default ChatMessages;
