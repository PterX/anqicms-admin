import { Modal, Spin, Tabs } from 'antd';

interface TemplateModalProps {
  visible: boolean;
  loading: boolean;
  files: any[];
  onClose: () => void;
  onSelect: (file: any) => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  visible,
  loading,
  files,
  onClose,
  onSelect,
}) => {
  const filterByExt = (ext: string) =>
    files.filter((f: any) => f.path.endsWith(ext));
  const filterOther = () =>
    files.filter(
      (f: any) =>
        !f.path.endsWith('.html') &&
        !f.path.endsWith('.css') &&
        !f.path.endsWith('.js'),
    );

  return (
    <Modal
      title="选择模板文件"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="small" />
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无模板文件
        </div>
      ) : (
        <div className="ai-chat-template-list">
          <Tabs
            items={[
              {
                key: 'html',
                label: `模板文件 (${filterByExt('.html').length})`,
                children: (
                  <div className="ai-chat-template-items">
                    {filterByExt('.html').map((file: any) => (
                      <div
                        key={file.path}
                        className="ai-chat-template-item"
                        onClick={() => onSelect(file)}
                      >
                        <span className="ai-chat-template-item-icon">📄</span>
                        <span className="ai-chat-template-item-path">
                          {file.name}
                          {file.remark ? ` (${file.remark})` : ''}
                        </span>
                        {file.last_mod > 0 && (
                          <span className="ai-chat-template-item-time">
                            {new Date(
                              file.last_mod * 1000,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'css',
                label: `样式文件 (${filterByExt('.css').length})`,
                children: (
                  <div className="ai-chat-template-items">
                    {filterByExt('.css').map((file: any) => (
                      <div
                        key={file.path}
                        className="ai-chat-template-item"
                        onClick={() => onSelect(file)}
                      >
                        <span className="ai-chat-template-item-icon">🎨</span>
                        <span className="ai-chat-template-item-path">
                          {file.name}
                          {file.remark ? ` (${file.remark})` : ''}
                        </span>
                        {file.last_mod > 0 && (
                          <span className="ai-chat-template-item-time">
                            {new Date(
                              file.last_mod * 1000,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'js',
                label: `脚本文件 (${filterByExt('.js').length})`,
                children: (
                  <div className="ai-chat-template-items">
                    {filterByExt('.js').map((file: any) => (
                      <div
                        key={file.path}
                        className="ai-chat-template-item"
                        onClick={() => onSelect(file)}
                      >
                        <span className="ai-chat-template-item-icon">⚡</span>
                        <span className="ai-chat-template-item-path">
                          {file.name}
                          {file.remark ? ` (${file.remark})` : ''}
                        </span>
                        {file.last_mod > 0 && (
                          <span className="ai-chat-template-item-time">
                            {new Date(
                              file.last_mod * 1000,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: 'other',
                label: `其他资源 (${filterOther().length})`,
                children: (
                  <div className="ai-chat-template-items">
                    {filterOther().map((file: any) => (
                      <div
                        key={file.path}
                        className="ai-chat-template-item"
                        onClick={() => onSelect(file)}
                      >
                        <span className="ai-chat-template-item-icon">📁</span>
                        <span className="ai-chat-template-item-path">
                          {file.name}
                          {file.remark ? ` (${file.remark})` : ''}
                        </span>
                        {file.last_mod > 0 && (
                          <span className="ai-chat-template-item-time">
                            {new Date(
                              file.last_mod * 1000,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default TemplateModal;
