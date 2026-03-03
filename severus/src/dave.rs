use anyhow::{anyhow, Result};
use davey::{DaveSession as InnerDaveSession, ProposalsOperationType};
use neon::context::Context;
use neon::prelude::FunctionContext;
use neon::prelude::*;
use neon::result::JsResult;
use neon::types::Finalize;
use neon::types::JsPromise;
use std::num::NonZeroU16;
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use crate::constants::runtime;

pub struct DaveSession {
    inner: Mutex<InnerDaveSession>,
}

impl Finalize for DaveSession {}

impl DaveSession {
    fn parse_user_id(user_id: &str) -> Result<u64> {
        u64::from_str(user_id).map_err(|_| anyhow!("Invalid user id"))
    }

    fn parse_channel_id(channel_id: &str) -> Result<u64> {
        u64::from_str(channel_id).map_err(|_| anyhow!("Invalid channel id"))
    }

    fn parse_protocol_version(protocol_version: u16) -> Result<NonZeroU16> {
        NonZeroU16::new(protocol_version)
            .ok_or_else(|| anyhow!("DAVE protocol version must be greater than 0"))
    }

    pub fn new(protocol_version: u16, user_id: &str, channel_id: &str) -> Result<Arc<Self>> {
        let protocol_version = Self::parse_protocol_version(protocol_version)?;
        let user_id = Self::parse_user_id(user_id)?;
        let channel_id = Self::parse_channel_id(channel_id)?;
        let session = InnerDaveSession::new(protocol_version, user_id, channel_id, None)
            .map_err(|e| anyhow!(e.to_string()))?;
        Ok(Arc::new(Self {
            inner: Mutex::new(session),
        }))
    }

    pub fn reinit(&self, protocol_version: u16, user_id: &str, channel_id: &str) -> Result<()> {
        let protocol_version = Self::parse_protocol_version(protocol_version)?;
        let user_id = Self::parse_user_id(user_id)?;
        let channel_id = Self::parse_channel_id(channel_id)?;
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session
            .reinit(protocol_version, user_id, channel_id, None)
            .map_err(|e| anyhow!(e.to_string()))
    }

    pub fn reset(&self) -> Result<()> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session.reset().map_err(|e| anyhow!(e.to_string()))
    }

    pub fn set_external_sender(&self, payload: &[u8]) -> Result<()> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session
            .set_external_sender(payload)
            .map_err(|e| anyhow!(e.to_string()))
    }

    pub fn create_key_package(&self) -> Result<Vec<u8>> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session
            .create_key_package()
            .map_err(|e| anyhow!(e.to_string()))
    }

    pub fn process_proposals(
        &self,
        operation_type: u8,
        payload: &[u8],
        recognized_user_ids: &[u64],
    ) -> Result<(Option<Vec<u8>>, Option<Vec<u8>>)> {
        let operation_type = match operation_type {
            0 => ProposalsOperationType::APPEND,
            1 => ProposalsOperationType::REVOKE,
            _ => return Err(anyhow!("Invalid proposals operation type")),
        };
        let mut session = self.inner.lock().expect("failed to lock dave session");
        let result = session
            .process_proposals(operation_type, payload, Some(recognized_user_ids))
            .map_err(|e| anyhow!(e.to_string()))?;
        match result {
            Some(commit_welcome) => Ok((Some(commit_welcome.commit), commit_welcome.welcome)),
            None => Ok((None, None)),
        }
    }

    pub fn process_commit(&self, payload: &[u8]) -> Result<()> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session
            .process_commit(payload)
            .map_err(|e| anyhow!(e.to_string()))
    }

    pub fn process_welcome(&self, payload: &[u8]) -> Result<()> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session
            .process_welcome(payload)
            .map_err(|e| anyhow!(e.to_string()))
    }

    pub fn set_passthrough_mode(&self, passthrough_mode: bool, transition_expiry: u32) {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        session.set_passthrough_mode(passthrough_mode, Some(transition_expiry));
    }

    pub fn can_passthrough(&self, user_id: &str) -> Result<bool> {
        let user_id = Self::parse_user_id(user_id)?;
        let session = self.inner.lock().expect("failed to lock dave session");
        Ok(session.can_passthrough(user_id))
    }

    pub fn is_ready(&self) -> bool {
        let session = self.inner.lock().expect("failed to lock dave session");
        session.is_ready()
    }

    pub fn encrypt_opus(&self, payload: &[u8]) -> Result<Vec<u8>> {
        let mut session = self.inner.lock().expect("failed to lock dave session");
        if !session.is_ready() {
            return Ok(payload.to_vec());
        }
        let encrypted = session
            .encrypt_opus(payload)
            .map_err(|e| anyhow!(e.to_string()))?;
        Ok(encrypted.into_owned())
    }
}

fn js_array_to_vec(cx: &mut FunctionContext, value: Handle<JsArray>) -> Result<Vec<u8>> {
    let values = value.to_vec(cx).map_err(|e| anyhow!(e.to_string()))?;
    let mut out = Vec::with_capacity(values.len());
    for item in values {
        let num = item
            .downcast::<JsNumber, FunctionContext>(cx)
            .map_err(|_| anyhow!("Expected number array"))?
            .value(cx);
        out.push(num as u8);
    }
    Ok(out)
}

fn js_array_to_user_ids(cx: &mut FunctionContext, value: Handle<JsArray>) -> Result<Vec<u64>> {
    let values = value.to_vec(cx).map_err(|e| anyhow!(e.to_string()))?;
    let mut out = Vec::with_capacity(values.len());
    for item in values {
        let user_id = item
            .downcast::<JsString, FunctionContext>(cx)
            .map_err(|_| anyhow!("Expected string array"))?
            .value(cx);
        out.push(DaveSession::parse_user_id(&user_id)?);
    }
    Ok(out)
}

fn vec_to_js_array<'a, C: Context<'a>>(cx: &mut C, value: &[u8]) -> JsResult<'a, JsArray> {
    let arr = JsArray::new(cx, value.len());
    for (idx, item) in value.iter().enumerate() {
        let v = cx.number(*item as f64);
        arr.set(cx, idx as u32, v)?;
    }
    Ok(arr)
}

impl DaveSession {
    pub fn js_new(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let protocol_version = cx.argument::<JsNumber>(0)?.value(&mut cx) as u16;
        let user_id = cx.argument::<JsString>(1)?.value(&mut cx);
        let channel_id = cx.argument::<JsString>(2)?.value(&mut cx);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let session = DaveSession::new(protocol_version, &user_id, &channel_id);
            deferred.settle_with(&channel, move |mut cx| match session {
                Ok(session) => Ok(cx.boxed(session)),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_reinit(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let protocol_version = cx.argument::<JsNumber>(1)?.value(&mut cx) as u16;
        let user_id = cx.argument::<JsString>(2)?.value(&mut cx);
        let channel_id = cx.argument::<JsString>(3)?.value(&mut cx);
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.reinit(protocol_version, &user_id, &channel_id);
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_reset(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.reset();
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_set_external_sender(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let payload_arg = cx.argument::<JsArray>(1)?;
        let payload = js_array_to_vec(&mut cx, payload_arg)
            .or_else(|error| cx.throw_error(error.to_string()))?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.set_external_sender(&payload);
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_get_key_package(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.create_key_package();
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(payload) => {
                    let arr = vec_to_js_array(&mut cx, &payload)?;
                    Ok(arr.upcast::<JsValue>())
                }
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_process_proposals(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let operation_type = cx.argument::<JsNumber>(1)?.value(&mut cx) as u8;
        let payload_arg = cx.argument::<JsArray>(2)?;
        let payload = js_array_to_vec(&mut cx, payload_arg)
            .or_else(|error| cx.throw_error(error.to_string()))?;
        let recognized_arg = cx.argument::<JsArray>(3)?;
        let recognized_user_ids = js_array_to_user_ids(&mut cx, recognized_arg)
            .or_else(|error| cx.throw_error(error.to_string()))?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.process_proposals(operation_type, &payload, &recognized_user_ids);
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok((commit, welcome)) => {
                    let obj = cx.empty_object();
                    if let Some(commit) = commit {
                        let commit = vec_to_js_array(&mut cx, &commit)?;
                        obj.set(&mut cx, "commit", commit)?;
                    }
                    if let Some(welcome) = welcome {
                        let welcome = vec_to_js_array(&mut cx, &welcome)?;
                        obj.set(&mut cx, "welcome", welcome)?;
                    }
                    Ok(obj.upcast::<JsValue>())
                }
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_process_commit(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let payload_arg = cx.argument::<JsArray>(1)?;
        let payload = js_array_to_vec(&mut cx, payload_arg)
            .or_else(|error| cx.throw_error(error.to_string()))?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.process_commit(&payload);
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_process_welcome(mut cx: FunctionContext) -> JsResult<JsPromise> {
        let rt = runtime(&mut cx)?;
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let payload_arg = cx.argument::<JsArray>(1)?;
        let payload = js_array_to_vec(&mut cx, payload_arg)
            .or_else(|error| cx.throw_error(error.to_string()))?;
        let channel = cx.channel();
        let (deferred, promise) = cx.promise();

        rt.spawn(async move {
            let result = session.process_welcome(&payload);
            deferred.settle_with(&channel, move |mut cx| match result {
                Ok(_) => Ok(cx.undefined()),
                Err(error) => cx.throw_error(error.to_string()),
            });
        });

        Ok(promise)
    }

    pub fn js_set_passthrough_mode(mut cx: FunctionContext) -> JsResult<JsUndefined> {
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let passthrough_mode = cx.argument::<JsBoolean>(1)?.value(&mut cx);
        let transition_expiry = cx.argument::<JsNumber>(2)?.value(&mut cx) as u32;
        session.set_passthrough_mode(passthrough_mode, transition_expiry);
        Ok(cx.undefined())
    }

    pub fn js_can_passthrough(mut cx: FunctionContext) -> JsResult<JsBoolean> {
        let session = {
            let session = cx.argument::<JsBox<Arc<DaveSession>>>(0)?;
            Arc::clone(&*session)
        };
        let user_id = cx.argument::<JsString>(1)?.value(&mut cx);
        match session.can_passthrough(&user_id) {
            Ok(can) => Ok(cx.boolean(can)),
            Err(error) => cx.throw_error(error.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::DaveSession;

    #[test]
    fn rejects_zero_protocol_version() {
        assert!(DaveSession::parse_protocol_version(0).is_err());
        assert!(DaveSession::parse_protocol_version(1).is_ok());
    }

    #[test]
    fn encrypt_opus_passthrough_before_ready() {
        let session = DaveSession::new(1, "1", "1").expect("session should initialize");
        let input = vec![0xAA, 0xBB, 0xCC];
        let output = session
            .encrypt_opus(&input)
            .expect("non-ready session should passthrough");
        assert_eq!(input, output);
    }
}
