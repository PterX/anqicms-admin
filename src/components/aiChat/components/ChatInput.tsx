import { DownOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, MenuProps } from 'antd';
import { AiProviderConfig } from '../types';
import { formatTokenCount } from '../utils';

interface ChatInputProps {
  inputValue: string;
  loading: boolean;
  uploadedFiles: any[];
  selectedModel: string;
  selectItems: MenuProps['items'];
  tokenUsage: any;
  customProviders: AiProviderConfig[];
  onInputChange: (val: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSend: () => void;
  onModelChange: (model: string) => void;
  onRemoveFile: (index: number) => void;
  onDropFile: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  loading,
  uploadedFiles,
  selectedModel,
  selectItems,
  tokenUsage,
  customProviders,
  onInputChange,
  onKeyPress,
  onPaste,
  onSend,
  onModelChange,
  onRemoveFile,
  onDropFile,
  onDragOver,
}) => {
  // 构建模型选项列表
  const modelOptions = [
    { label: 'AnQi Flash', value: 'anqi-flash' },
    { label: 'AnQi Pro', value: 'anqi-pro' },
    ...customProviders.map((p, index) => ({
      label: p.name,
      value: `custom:${index}`,
    })),
  ];

  // 当前选中模型的显示名称
  const currentModelLabel =
    modelOptions.find((o) => o.value === selectedModel)?.label || selectedModel;

  // Dropdown 菜单项
  const modelMenuItems: MenuProps['items'] = [
    {
      key: '__group_官方__',
      type: 'group',
      label: '安企官方接口',
      children: [
        { key: 'anqi-flash', label: 'AnQi Flash' },
        { key: 'anqi-pro', label: 'AnQi Pro' },
      ],
    },
    ...(customProviders.length > 0
      ? [
          {
            key: '__group_自定义__',
            type: 'group' as const,
            label: '自定义接口',
            children: customProviders.map((p, index) => ({
              key: `custom:${index}`,
              label: p.name,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="ai-chat-input" onDrop={onDropFile} onDragOver={onDragOver}>
      {uploadedFiles.length > 0 && (
        <div className="ai-chat-input-files">
          {uploadedFiles.map((file, index) => (
            <span key={index} className="ai-chat-input-file-tag">
              <span className="file-name">{file.file_name}</span>
              <span className="file-remove" onClick={() => onRemoveFile(index)}>
                ×
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="ai-chat-input-row">
        <Input.TextArea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyPress}
          onPaste={onPaste}
          placeholder="输入消息，按 Shift + Enter 换行，可拖拽上传文件，可粘贴图片，按 Enter 发送"
          disabled={loading}
          autoSize={{ minRows: 1, maxRows: 6 }}
        />

        <div className="ai-chat-input-toolbar">
          <div className="ai-chat-input-toolbar-left">
            <Dropdown menu={{ items: selectItems }} placement="topLeft">
              <Button
                type="text"
                icon={<PlusOutlined />}
                disabled={loading}
                className="ai-chat-select"
              />
            </Dropdown>
            <Dropdown
              menu={{
                items: modelMenuItems,
                onClick: ({ key }) => onModelChange(key),
                selectable: true,
                selectedKeys: [selectedModel],
              }}
              placement="topLeft"
            >
              <Button
                type="text"
                size="small"
                className="ai-chat-model-select"
              >
                {currentModelLabel} <DownOutlined />
              </Button>
            </Dropdown>
          </div>
          {tokenUsage.total > 0 && (
            <div className="ai-chat-token">
              <div>In:{formatTokenCount(tokenUsage.prompt)}</div>
              <div>Out:{formatTokenCount(tokenUsage.completion)}</div>
            </div>
          )}
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onSend}
            loading={loading}
            disabled={!inputValue.trim()}
            className="ai-chat-send"
          />
        </div>
      </div>
      <div className="ai-chat-disclaimer">
        内容由 AI 生成，仅供参考，您据此所作判断及操作均由您自行承担责任。
      </div>
    </div>
  );
};

export default ChatInput;
