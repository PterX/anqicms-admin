import { Button, Drawer, List, Popconfirm, Spin, Tag, Tooltip, message } from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

interface SkillItem {
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  updated_at: string;
  file_count: number;
}

interface SkillListDrawerProps {
  visible: boolean;
  loading: boolean;
  skills: SkillItem[];
  onClose: () => void;
  onView: (skill: SkillItem) => void;
  onReload: () => void;
  onDelete: (skill: SkillItem) => void;
}

const SkillListDrawer: React.FC<SkillListDrawerProps> = ({
  visible,
  loading,
  skills,
  onClose,
  onView,
  onReload,
  onDelete,
}) => {
  return (
    <Drawer
      title="技能 (Skills) 管理"
      placement="right"
      className="skill-list-drawer"
      open={visible}
      onClose={onClose}
      width={560}
      extra={
        <Tooltip title="重载所有技能">
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={onReload}
          />
        </Tooltip>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="small" />
        </div>
      ) : skills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无技能。
          <br />
          在 AI 聊天中告诉 AI 创建即可，例如：
          <br />
          <em>创建一个翻译技能，将英文文章翻译成中文</em>
        </div>
      ) : (
        <List
          size="small"
          dataSource={skills}
          renderItem={(item: SkillItem) => (
            <List.Item
              actions={[
                <Button
                  key="view"
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onView(item)}
                >
                  查看
                </Button>,
                <Popconfirm
                  key="delete"
                  title={`确定删除技能 "${item.name}"？`}
                  onConfirm={() => onDelete(item)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    {item.name}
                    {item.version && (
                      <Tag style={{ marginLeft: 6, fontSize: 11 }}>
                        v{item.version}
                      </Tag>
                    )}
                    {item.category && (
                      <Tag color="blue" style={{ fontSize: 11 }}>
                        {item.category}
                      </Tag>
                    )}
                  </div>
                }
                description={
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {item.description && (
                      <div
                        style={{
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                    <div style={{ color: '#999' }}>
                      {item.tags && item.tags.length > 0 && (
                        <span>
                          {item.tags.map((tag) => (
                            <Tag key={tag} style={{ fontSize: 10 }}>
                              {tag}
                            </Tag>
                          ))}
                        </span>
                      )}
                      <span>
                        {item.file_count} 个文件
                        {item.updated_at
                          ? ` | 更新于 ${item.updated_at}`
                          : ''}
                      </span>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default SkillListDrawer;
