package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.OrderSettleDTO;
import com.garment.DTO.OrderSettleRowDTO;
import com.garment.DTO.OrderSettleSizeDetailDTO;
import com.garment.model.OrderSettle;
import com.garment.model.OrderSettleRow;
import com.garment.model.OrderSettleSizeDetail;
import com.garment.repository.OrderSettleRepository;
import com.garment.service.OrderSettleService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderSettleServiceImpl implements OrderSettleService {

    private final OrderSettleRepository repo;

    @Override
    public OrderSettleDTO create(OrderSettleDTO dto) {
        OrderSettle entity = new OrderSettle();
        copyDtoToEntity(dto, entity);
        OrderSettle saved = repo.save(entity);
        return toDto(saved);
    }

    @Override
    public OrderSettleDTO update(Long id, OrderSettleDTO dto) {
        OrderSettle existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order Settle not found: " + id));
        copyDtoToEntity(dto, existing);
        OrderSettle saved = repo.save(existing);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderSettleDTO get(Long id) {
        OrderSettle entity = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order Settle not found: " + id));
        return toDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderSettleDTO> list() {
        return repo.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(Long id) {
        repo.deleteById(id);
    }

    /* ---------- Mapping ---------- */

    private OrderSettleDTO toDto(OrderSettle e) {
        OrderSettleDTO d = new OrderSettleDTO();
        d.setId(e.getId());
        d.setChallanNo(e.getChallanNo());
        d.setDated(e.getDated());
        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setBroker(e.getBroker());
        d.setTransport(e.getTransport());
        d.setRemarks1(e.getRemarks1());
        if (e.getRows() != null) {
            d.setRows(e.getRows().stream().map(this::rowToDto).collect(Collectors.toList()));
        }
        return d;
    }

    private OrderSettleRowDTO rowToDto(OrderSettleRow r) {
        OrderSettleRowDTO d = new OrderSettleRowDTO();
        d.setId(r.getId());
        d.setSaleOrderId(r.getSaleOrderId());
        d.setSaleOrderNo(r.getSaleOrderNo());
        d.setSaleOrderRowId(r.getSaleOrderRowId());
        d.setBarCode(r.getBarCode());
        d.setArtNo(r.getArtNo());
        d.setDescription(r.getDescription());
        d.setShade(r.getShade());
        if (r.getSizeDetails() != null) {
            d.setSizeDetails(
                    r.getSizeDetails().stream().map(this::sizeToDto).collect(Collectors.toList())
            );
        }
        return d;
    }

    private OrderSettleSizeDetailDTO sizeToDto(OrderSettleSizeDetail sd) {
        OrderSettleSizeDetailDTO d = new OrderSettleSizeDetailDTO();
        d.setId(sd.getId());
        d.setSizeName(sd.getSizeName());
        d.setSettleBox(sd.getSettleBox());
        return d;
    }

    private void copyDtoToEntity(OrderSettleDTO d, OrderSettle e) {
        e.setChallanNo(d.getChallanNo());
        e.setDated(d.getDated());
        e.setPartyId(d.getPartyId());
        e.setPartyName(d.getPartyName());
        e.setBroker(d.getBroker());
        e.setTransport(d.getTransport());
        e.setRemarks1(d.getRemarks1());

        e.getRows().clear();
        if (d.getRows() != null) {
            for (OrderSettleRowDTO rd : d.getRows()) {
                OrderSettleRow r = new OrderSettleRow();
                r.setSettle(e);
                r.setSaleOrderId(rd.getSaleOrderId());
                r.setSaleOrderNo(rd.getSaleOrderNo());
                r.setSaleOrderRowId(rd.getSaleOrderRowId());
                r.setBarCode(rd.getBarCode());
                r.setArtNo(rd.getArtNo());
                r.setDescription(rd.getDescription());
                r.setShade(rd.getShade());

                if (rd.getSizeDetails() != null) {
                    for (OrderSettleSizeDetailDTO sdd : rd.getSizeDetails()) {
                        OrderSettleSizeDetail sd = new OrderSettleSizeDetail();
                        sd.setRow(r);
                        sd.setSizeName(sdd.getSizeName());
                        sd.setSettleBox(sdd.getSettleBox());
                        r.addSize(sd);
                    }
                }
                e.addRow(r);
            }
        }
    }
}