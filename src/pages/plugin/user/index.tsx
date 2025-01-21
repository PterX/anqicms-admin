import { pluginDeleteUserInfo, pluginGetUserGroups, pluginGetUsers } from '@/services';
import {
  ActionType,
  PageContainer,
  ProColumns,
  ProFormSelect,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Modal, Space, message } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import UserFieldSetting from './components/setting';
import UserForm from './components/userForm';
import { FormattedMessage, useIntl } from '@umijs/max';

const PluginUser: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [currentUser, setCurrentUser] = useState<any>({});
  const [editVisible, setEditVisible] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const intl = useIntl();

  const getUserGroups = () => {
    pluginGetUserGroups().then((res) => {
      setUserGroups(res.data || []);
    });
  };

  useEffect(() => {
    getUserGroups();
  }, []);

  const handleEditUser = async (record: any) => {
    setCurrentUser(record);
    setEditVisible(true);
  };

  const handleDelete = (row: any) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'plugin.user.delete.confirm' }),
      onOk: () => {
        pluginDeleteUserInfo(row).then((res) => {
          message.info(res.msg);
          actionRef.current?.reload();
        });
      },
    });
  };

  const handleAddUser = () => {
    setCurrentUser({});
    setEditVisible(true);
  };

  const columns: ProColumns<any>[] = [
    {
      title: intl.formatMessage({ id: 'plugin.retailer.user-id' }),
      dataIndex: 'id',
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.user-name' }),
      dataIndex: 'user_name',
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.phone' }),
      dataIndex: 'phone',
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.email' }),
      hideInSearch: true,
      dataIndex: 'email',
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.real-name' }),
      dataIndex: 'real_name',
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.avatar_url' }),
      dataIndex: 'full_avatar_url',
      hideInSearch: true,
      width: 70,
      render: (text, record) => {
        return text ? <img src={record.full_avatar_url} className="list-thumb" /> : null;
      },
    },
    {
      title: intl.formatMessage({ id: 'plugin.user.group' }),
      dataIndex: 'group_id',
      render: (_, entity) => {
        return entity.group?.title;
      },
      renderFormItem: (_, { fieldProps }) => {
        return (
          <ProFormSelect
            name="group_id"
            request={async () => {
              return [{ title: intl.formatMessage({ id: 'plugin.user.group.all' }), id: 0 }].concat(userGroups || []);
            }}
            fieldProps={{
              fieldNames: {
                label: 'title',
                value: 'id',
              },
              ...fieldProps,
            }}
          />
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'plugin.retailer.create-time' }),
      dataIndex: 'created_time',
      hideInSearch: true,
      render: (dom: any, entity) => {
        return dayjs(entity.created_time * 1000).format('YYYY-MM-DD HH:mm');
      },
    },
    {
      title: intl.formatMessage({ id: 'setting.action' }),
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space size={20}>
          <a
            key="edit"
            onClick={() => {
              handleEditUser(record);
            }}
          >
            <FormattedMessage id="setting.action.edit" />
          </a>
          <a
            onClick={() => {
              handleDelete(record);
            }}
          >
            <FormattedMessage id="setting.system.delete" />
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle={intl.formatMessage({ id: 'menu.plugin.user' })}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <Button key="add" onClick={handleAddUser}><FormattedMessage id="plugin.user.add" /></Button>,
          <UserFieldSetting key="setting">
            <Button><FormattedMessage id="plugin.user.setting" /></Button>
          </UserFieldSetting>,
        ]}
        tableAlertOptionRender={false}
        request={(params) => {
          return pluginGetUsers(params);
        }}
        columnsState={{
          persistenceKey: 'user-table',
          persistenceType: 'localStorage',
        }}
        columns={columns}
        rowSelection={false}
        pagination={{
          showSizeChanger: true,
        }}
      />
      {editVisible && (
        <UserForm
          open={editVisible}
          user={currentUser}
          onCancel={() => {
            setEditVisible(false);
          }}
          onSubmit={async () => {
            setEditVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }}
        />
      )}
    </PageContainer>
  );
};

export default PluginUser;
