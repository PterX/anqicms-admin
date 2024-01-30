import { Button, message, Modal, Space } from 'antd';
import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import type { ProColumns, ActionType } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { deleteArchive, getArchiveInfo, getArchives, recoverArchive } from '@/services';

const ArchiveList: React.FC = (props) => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [visible, setVisible] = useState<boolean>(false);
  const [currentArchive, setCurrentArchive] = useState<any>(null);

  const handleRemove = async (selectedRowKeys: any[]) => {
    Modal.confirm({
      title: '确定要删除选中的文档吗？',
      onOk: async () => {
        const hide = message.loading('正在删除', 0);
        if (!selectedRowKeys) return true;
        try {
          for (let item of selectedRowKeys) {
            await deleteArchive({
              id: item,
            });
          }
          hide();
          message.success('删除成功');
          setSelectedRowKeys([]);
          actionRef.current?.reloadAndRest?.();
          return true;
        } catch (error) {
          hide();
          message.error('删除失败');
          return true;
        }
      },
    });
  };

  const handleRecover = async (selectedRowKeys: any[]) => {
    Modal.confirm({
      title: '确定要恢复选中的文档吗？',
      onOk: async () => {
        const hide = message.loading('正在恢复', 0);
        if (!selectedRowKeys) return true;
        try {
          for (let item of selectedRowKeys) {
            await recoverArchive({
              id: item,
            });
          }
          hide();
          message.success('恢复成功');
          setSelectedRowKeys([]);
          actionRef.current?.reloadAndRest?.();
          return true;
        } catch (error) {
          hide();
          message.error('恢复失败');
          return true;
        }
      },
    });
  };

  const previewArchive = (item: any) => {
    setCurrentArchive(item);
    setVisible(true);
    getArchiveInfo({ id: item.id }).then((res) => {
      setCurrentArchive(res.data || {});
    });
  };

  const columns: ProColumns<any>[] = [
    {
      title: '编号',
      dataIndex: 'id',
      hideInSearch: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      hideInSearch: true,
      render: (dom, entity) => {
        return (
          <div style={{ maxWidth: 400 }}>
            <a onClick={() => previewArchive(entity)}>{dom}</a>
          </div>
        );
      },
    },
    {
      title: 'thumb',
      dataIndex: 'thumb',
      hideInSearch: true,
      render: (text, record) => {
        return text ? <img src={record.thumb} className="list-thumb" /> : null;
      },
    },
    {
      title: '内容模型',
      dataIndex: 'module_name',
      hideInSearch: true,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space size={20}>
          <a
            className="text-red"
            key="recover"
            onClick={async () => {
              await handleRecover([record.id]);
            }}
          >
            恢复
          </a>
          <a
            className="text-red"
            key="delete"
            onClick={async () => {
              await handleRemove([record.id]);
            }}
          >
            删除
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle="文档回收站"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => []}
        tableAlertOptionRender={({ selectedRowKeys, onCleanSelected }) => (
          <Space>
            <Button
              size={'small'}
              onClick={async () => {
                await handleRecover(selectedRowKeys);
              }}
            >
              批量恢复
            </Button>
            <Button
              size={'small'}
              onClick={async () => {
                await handleRemove(selectedRowKeys);
              }}
            >
              批量删除
            </Button>
            <Button type="link" size={'small'} onClick={onCleanSelected}>
              取消选择
            </Button>
          </Space>
        )}
        request={(params) => {
          params.recycle = true;
          return getArchives(params);
        }}
        columns={columns}
        rowSelection={{
          onChange: (selectedRowKeys) => {
            setSelectedRowKeys(selectedRowKeys);
          },
        }}
        pagination={{
          showSizeChanger: true,
        }}
      />
      <Modal
        title="文档预览"
        open={visible}
        width={1000}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      >
        <h3>{currentArchive?.title}</h3>
        <div className="article-content">
          <div dangerouslySetInnerHTML={{ __html: currentArchive?.data?.content }}></div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default ArchiveList;
