import Footer from '@/components/Footer';
import {
  findPasswordChoose,
  findPasswordReset,
  findPasswordVerify,
  getCaptcha,
  login,
} from '@/services/admin';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormCheckbox, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl, useModel } from '@umijs/max';
import { Alert, Button, Input, Modal, Steps, message } from 'antd';
import React, { useEffect, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { getSiteInfo } from '@/services';
import { setStore } from '@/utils/store';
import styles from './index.less';

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => (
  <Alert
    style={{
      marginBottom: 24,
    }}
    message={content}
    type="error"
    showIcon
  />
);

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<any>({});
  const [type, setType] = useState<string>('account');
  const { initialState, setInitialState } = useModel('@@initialState');
  const [captcha, setCaptcha] = useState<any>({});
  const [siteInfo, setSiteInfo] = useState<any>({});
  const [findVisible, setFindVisible] = useState<boolean>(false);
  const [findStep, setFindSetp] = useState<number>(0);
  const [findStatus, setFindStatus] = useState<any>({});
  const [resetInfo, setResetInfo] = useState<any>({});
  const intl = useIntl();

  useEffect(() => {
    handleGetCaptcha();

    initSiteInfo();
  }, []);

  const initSiteInfo = async () => {
    getSiteInfo({}).then((res) => {
      setSiteInfo(res?.data || {});
    });
  };

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    const anqiUser = await initialState?.fetchAnqiUser?.();
    // 补充 system setting
    const system = await initialState?.fetchSystemSetting?.();
    if (userInfo) {
      await setInitialState((s) => ({
        ...s,
        currentUser: userInfo,
        anqiUser: anqiUser,
        system: system,
      }));
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // 登录
      if (!captcha.captcha_off) {
        values.captcha_id = captcha.captcha_id;
      }
      const res = await login({ ...values, type });
      if (res.code === 0) {
        const defaultLoginSuccessMessage = intl.formatMessage({ id: 'pages.login.success' });
        message.success(defaultLoginSuccessMessage);

        setStore('adminToken', res.data.token);
        await fetchUserInfo();
        /** 此方法会跳转到 redirect 参数所在的位置 */
        if (!history) return;
        history.push('/dashboard');
        return;
      } else {
        //error
        handleGetCaptcha();
      }
      // 如果失败去设置用户错误信息
      setUserLoginState(res);
    } catch (error) {
      console.log(error);
      const defaultLoginFailureMessage = intl.formatMessage({ id: 'pages.login.failure' });
      message.error(defaultLoginFailureMessage);
    }
  };

  const handleGetCaptcha = async () => {
    try {
      const res = await getCaptcha();
      setCaptcha(res.data || {});
    } catch (e) {
      message.error(intl.formatMessage({ id: 'pages.login.captcha-failure' }));
    }
  };

  const chooseFindWay = async (way: string) => {
    findPasswordChoose({ way: way })
      .then((res) => {
        setFindStatus(res.data || {});
        setFindSetp(1);
      })
      .catch();
  };

  const onChangeResetInfo = (field: string, e: any) => {
    resetInfo[field] = e.target.value;
    setResetInfo(Object.assign({}, resetInfo));
  };

  const resetPassword = () => {
    if (findStep == 1) {
      // 第二步
      findPasswordVerify()
        .then((res) => {
          if (res.code !== 0) {
            message.error(res.msg || intl.formatMessage({ id: 'pages.login.verify-failure' }));
          } else {
            setFindSetp(2);
          }
        })
        .catch();
    } else if (findStep == 2) {
      // 最后一步
      findPasswordReset(resetInfo)
        .then((res) => {
          if (res.code !== 0) {
            message.error(res.msg || intl.formatMessage({ id: 'pages.login.verify-failure' }));
          } else {
            Modal.info({
              title: intl.formatMessage({ id: 'pages.login.reset-account-success' }),
            });
            setFindSetp(0);
            setFindVisible(false);
          }
        })
        .catch();
    } else {
      // 第一步
      chooseFindWay('file');
    }
  };

  const handleDownloadFile = () => {
    let alink = document.createElement('a');

    alink.href = 'data:text/plan;charset=utf-8,' + encodeURIComponent(findStatus.token);

    alink.download = findStatus.token + '.txt';
    document.body.appendChild(alink);
    alink.click();
    document.body.removeChild(alink);
  };

  const { code = 0, msg } = userLoginState;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoginForm
          title={intl.formatMessage({ id: 'pages.login.anqicms' })}
          subTitle={
            <div>
              <p>
                <FormattedMessage id="pages.login.welcome" />
              </p>
              <p>
                <FormattedMessage id="pages.login.tips" />
                <a target="_blank" href={siteInfo.base_url}>
                  {siteInfo.name}
                </a>
              </p>
            </div>
          }
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values);
          }}
        >
          {code !== 0 && (
            <LoginMessage
              content={msg || intl.formatMessage({ id: 'pages.login.account-falure' })}
            />
          )}
          <ProFormText
            name="user_name"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined className={styles.prefixIcon} />,
            }}
            placeholder={intl.formatMessage({ id: 'pages.login.username.placeholder' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.login.username.required' }),
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined className={styles.prefixIcon} />,
            }}
            placeholder={intl.formatMessage({ id: 'pages.login.password.placeholder' })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({ id: 'pages.login.password.required' }),
              },
            ]}
          />
          {!captcha.captcha_off && (
            <ProFormText
              name="captcha"
              placeholder={''}
              fieldProps={{
                size: 'large',
                addonAfter: (
                  <img
                    className={styles.captcha}
                    onClick={handleGetCaptcha}
                    src={captcha.captcha}
                  />
                ),
              }}
            ></ProFormText>
          )}

          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="remember">
              <FormattedMessage id="pages.login.auto-login" />
            </ProFormCheckbox>
            <a
              style={{
                float: 'right',
              }}
              onClick={() => {
                setFindSetp(0);
                setFindVisible(true);
              }}
            >
              <FormattedMessage id="pages.login.forget-password" />
            </a>
          </div>
        </LoginForm>
      </div>
      <Footer />
      <Modal
        width={600}
        title={intl.formatMessage({ id: 'pages.login.reset-account' })}
        open={findVisible}
        onCancel={() => {
          if (findStep === 0) {
            setFindVisible(false);
          } else {
            setFindSetp(findStep - 1);
          }
        }}
        onOk={() => {
          resetPassword();
        }}
        cancelText={
          findStep == 0
            ? intl.formatMessage({ id: 'pages.login.cancel' })
            : intl.formatMessage({ id: 'pages.login.prev' })
        }
        okText={
          findStep == 1
            ? intl.formatMessage({ id: 'pages.login.finished' })
            : intl.formatMessage({ id: 'pages.login.submit' })
        }
      >
        <Steps current={findStep}>
          <Steps.Step title={intl.formatMessage({ id: 'pages.login.step.select' })} />
          <Steps.Step title={intl.formatMessage({ id: 'pages.login.step.verify' })} />
          <Steps.Step title={intl.formatMessage({ id: 'pages.login.step.reset' })} />
        </Steps>
        <div className={styles.resetBox}>
          {findStep === 2 ? (
            <div className={styles.resetPassword}>
              <div className={styles.field}>
                <Input
                  name="user_name"
                  size="large"
                  prefix={<UserOutlined className={styles.prefixIcon} />}
                  placeholder={intl.formatMessage({ id: 'pages.login.step.username' })}
                  value={resetInfo.user_name || ''}
                  required
                  onChange={(e) => onChangeResetInfo('user_name', e)}
                />
              </div>
              <div className={styles.field}>
                <Input.Password
                  name="password"
                  size="large"
                  value={resetInfo.password || ''}
                  prefix={<LockOutlined className={styles.prefixIcon} />}
                  placeholder={intl.formatMessage({ id: 'pages.login.step.password.placeholder' })}
                  onChange={(e) => onChangeResetInfo('password', e)}
                />
              </div>
            </div>
          ) : findStep == 1 ? (
            <div className={styles.resetTips}>
              {findStatus.way == 'file' ? (
                <div>
                  <h3>
                    <FormattedMessage id="setting.login.step.file" />
                  </h3>
                  <p>
                    <FormattedMessage id="setting.login.step.file.tips1" />
                    <a onClick={handleDownloadFile}>
                      <FormattedMessage id="setting.login.step.file.tips1.download" />
                    </a>
                    <FormattedMessage id="setting.login.step.file.tips1.download-file" />
                  </p>
                  <p>
                    <FormattedMessage id="setting.login.step.file.tips2" />
                  </p>
                  <p>
                    <FormattedMessage id="setting.login.step.file.tips3" />
                  </p>
                  <p>
                    <FormattedMessage id="setting.login.step.file.tips4" />
                  </p>
                </div>
              ) : (
                <div>
                  <h3>
                    <FormattedMessage id="setting.login.step.dns" />
                  </h3>
                  <p>
                    <FormattedMessage id="setting.login.step.dns.tips1" />
                  </p>
                  <p>
                    <FormattedMessage id="setting.login.step.dns.tips2.before" />
                    <code>{findStatus.host}</code>
                    <FormattedMessage id="setting.login.step.dns.tips2.after" />
                  </p>
                  <div className={styles.copyItem}>
                    <span className={styles.copyText}>{findStatus.token}</span>
                    <CopyToClipboard
                      text={findStatus.token}
                      onCopy={() => {
                        message.info(intl.formatMessage({ id: 'pages.login.step.copy-success' }));
                      }}
                    >
                      <Button className={styles.copyBtn}>
                        <FormattedMessage id="setting.login.step.copy" />
                      </Button>
                    </CopyToClipboard>
                  </div>
                  <p className={styles.copyTips}>
                    <FormattedMessage id="setting.login.step.dns.tips2.tips" />
                  </p>
                  <p>
                    <FormattedMessage id="setting.login.step.dns.tips3" />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.chooseItems}>
              <div className={styles.chooseItem}>
                <Button
                  size="large"
                  block
                  onClick={() => {
                    chooseFindWay('file');
                  }}
                >
                  <FormattedMessage id="setting.login.step.file" />
                </Button>
                <p className={styles.resetTips}>
                  <FormattedMessage id="setting.login.step.file.tips" />
                </p>
              </div>
              <div className={styles.chooseItem}>
                <Button
                  size="large"
                  block
                  onClick={() => {
                    chooseFindWay('dns');
                  }}
                >
                  <FormattedMessage id="setting.login.step.dns" />
                </Button>
                <p className={styles.resetTips}>
                  <FormattedMessage id="setting.login.step.dns.tips" />
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Login;
